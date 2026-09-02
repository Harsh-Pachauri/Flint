const mongoose = require('mongoose');
const { Profile, Swipe, College, Match, Notification } = require('../models');

const MAX_CANDIDATE_POOL = 1000;

// [0, 0] ("Null Island") must never be treated as a real location — profiles
// created before location capture existed (or that skipped it) may still
// have this as a leftover default; treat it the same as "no location set."
function hasRealLocation(coordinates) {
  return (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number' &&
    !(coordinates[0] === 0 && coordinates[1] === 0)
  );
}

// Small deterministic string hash (djb2) -> 32-bit seed for a PRNG.
function hashToSeed(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

// mulberry32 seeded PRNG — deterministic given the same seed.
function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic Fisher-Yates shuffle seeded by (viewer userId + calendar day).
// Same viewer sees the same order for the whole day (stable pagination — no
// repeats/gaps across `page` requests), and a fresh shuffle the next day.
function stableDailyShuffle(items, seedString) {
  const rng = mulberry32(hashToSeed(seedString));
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get discovery feed - paginated with stable per-day filtering
exports.getFeed = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { college } = req.query;
    // parse pagination params safely (req.query values are strings when present)
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const requestedDistanceKm = Number(req.query.distance);
    const hasDistanceFilter = Number.isFinite(requestedDistanceKm) && requestedDistanceKm > 0;

    // Get current user's profile for gender preferences
    const userProfile = await Profile.findOne({ userId });

    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Get IDs of already-swiped users (as ObjectIds for aggregation)
    const swipedUsers = await Swipe.find({ fromUserId: userId }).select('toUserId');
    const swipedUserIds = swipedUsers.map(s => s.toUserId);

    // Get IDs of already matched users (as ObjectIds for aggregation)
    const matchedDocs = await Match.find({ userIds: userId, status: 'active' }).select('userIds');
    const matchedUserIds = matchedDocs
      .flatMap(m => m.userIds)
      .filter(id => id.toString() !== userId);

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const excludeIds = [...swipedUserIds, ...matchedUserIds, userObjectId];

    // Matching is mutual: the candidate must satisfy the viewer's stated
    // preference, AND the viewer must satisfy the candidate's own stated
    // preference (or the candidate is open to 'both').
    const matchStage = {
      userId: { $nin: excludeIds },
      gender: userProfile.genderPreference !== 'both' ? userProfile.genderPreference : { $exists: true },
      $or: [
        { genderPreference: 'both' },
        { genderPreference: userProfile.gender }
      ]
    };

    if (college && userProfile.collegeId) {
      matchStage.collegeId = userProfile.collegeId;
    }

    const viewerHasLocation = hasRealLocation(userProfile.location && userProfile.location.coordinates);
    const applyDistanceFilter = hasDistanceFilter && viewerHasLocation;

    // Step 1: resolve the candidate ID pool (capped for performance, same as
    // the previous $sample cap). If the viewer has a real location and asked
    // for a distance filter, use $geoNear (requires the 2dsphere index and
    // must be the pipeline's first stage); otherwise a plain filtered find.
    let candidateIds;
    let total;

    if (applyDistanceFilter) {
      const geoResults = await Profile.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: userProfile.location.coordinates },
            distanceField: '_distanceMeters',
            maxDistance: requestedDistanceKm * 1000,
            spherical: true,
            query: matchStage
          }
        },
        { $limit: MAX_CANDIDATE_POOL },
        { $project: { userId: 1 } }
      ]);
      candidateIds = geoResults.map((doc) => doc.userId.toString());

      const countResult = await Profile.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: userProfile.location.coordinates },
            distanceField: '_distanceMeters',
            maxDistance: requestedDistanceKm * 1000,
            spherical: true,
            query: matchStage
          }
        },
        { $count: 'total' }
      ]);
      total = countResult.length > 0 ? countResult[0].total : 0;
    } else {
      const docs = await Profile.find(matchStage).select('userId').limit(MAX_CANDIDATE_POOL).lean();
      candidateIds = docs.map((doc) => doc.userId.toString());
      total = await Profile.countDocuments(matchStage);
    }

    // Step 2: deterministic per-viewer, per-day shuffle so paging is stable
    // (no repeats/gaps between `page=1` and `page=2` requests today), while
    // still varying day-to-day so returning users see fresh ordering.
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const shuffledIds = stableDailyShuffle(candidateIds, `${userId}:${today}`);
    const skip = (page - 1) * limit;
    const pageIds = shuffledIds.slice(skip, skip + limit);

    // Step 3: fetch full profile documents for just this page, then restore
    // the shuffled order ($in does not guarantee result order).
    const pageObjectIds = pageIds.map((id) => new mongoose.Types.ObjectId(id));
    const pageProfiles = await Profile.aggregate([
      { $match: { userId: { $in: pageObjectIds } } },
      {
        $lookup: {
          from: 'colleges',
          localField: 'collegeId',
          foreignField: '_id',
          as: 'collegeId'
        }
      },
      { $unwind: { path: '$collegeId', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: 1,
          name: 1,
          age: 1,
          gender: 1,
          bio: 1,
          photos: 1,
          aiAssessmentScore: 1,
          collegeId: { name: 1, city: 1 },
          year: 1,
          depart: 1,
          vibewords: 1
        }
      }
    ]);

    const profileByUserId = new Map(pageProfiles.map((p) => [p.userId.toString(), p]));
    const profiles = pageIds.map((id) => profileByUserId.get(id)).filter(Boolean);

    res.json({
      profiles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Record a swipe - left or right. Idempotent: repeated identical requests
// (double-clicks, network retries, near-concurrent requests) never create
// duplicate Swipe/Match/Notification records, backed by unique indexes on
// both Swipe (fromUserId+toUserId) and Match (pairKey, while active).
exports.swipe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { toUserId, direction } = req.body;

    if (!toUserId || !['like', 'pass'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid swipe data' });
    }

    if (toUserId === userId.toString()) {
      return res.status(400).json({ error: 'Cannot swipe on yourself' });
    }

    let swipe;
    let swipeAlreadyExisted = false;
    try {
      swipe = new Swipe({ fromUserId: userId, toUserId, direction, swipedAt: new Date() });
      await swipe.save();
    } catch (err) {
      if (err.code === 11000) {
        // Already recorded a decision for this pair — fetch it rather than
        // erroring or creating a duplicate. The original decision stands.
        swipe = await Swipe.findOne({ fromUserId: userId, toUserId });
        swipeAlreadyExisted = true;
      } else {
        throw err;
      }
    }

    let match = null;

    if (swipe.direction === 'like') {
      // Already matched? Short-circuit before touching notifications again.
      match = await Match.findOne({
        userIds: { $all: [userId, toUserId] },
        status: 'active'
      });

      if (!match) {
        const reverseSwipe = await Swipe.findOne({
          fromUserId: toUserId,
          toUserId: userId,
          direction: 'like'
        });

        if (reverseSwipe) {
          try {
            match = await Match.create({
              userIds: [userId, toUserId],
              status: 'active',
              matchedAt: new Date()
            });

            await Notification.create({
              userId: userId,
              type: 'match',
              title: 'You have a new match!',
              body: 'Your swipe was matched successfully.'
            });

            await Notification.create({
              userId: toUserId,
              type: 'match',
              title: 'You have a new match!',
              body: 'Someone you liked has matched with you.'
            });
          } catch (err) {
            if (err.code === 11000) {
              // A concurrent request won the race and created the match
              // first — use it, and skip sending a second round of
              // notifications for the same match.
              match = await Match.findOne({
                userIds: { $all: [userId, toUserId] },
                status: 'active'
              });
            } else {
              throw err;
            }
          }
        } else if (!swipeAlreadyExisted) {
          // Only notify the other user the first time this like is recorded
          await Notification.create({
            userId: toUserId,
            type: 'like',
            title: 'New swipe received',
            body: 'Someone liked your profile. View your incoming swipes to accept or reject.'
          });
        }
      }
    }

    res.json({
      swipeId: swipe._id,
      match: match ? { matchId: match._id, message: 'You have a match!' } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getIncomingSwipes = async (req, res) => {
  try {
    const userId = req.user.userId;

    const incomingSwipes = await Swipe.find({
      toUserId: userId,
      direction: 'like',
      status: 'pending'
    }).sort({ swipedAt: -1 });

    const fromUserIds = incomingSwipes.map(s => s.fromUserId.toString());
    const profiles = await Profile.find({ userId: { $in: fromUserIds } })
      .select('userId name age bio gender photos year depart vibewords');

    const profileMap = profiles.reduce((map, profile) => {
      map[profile.userId.toString()] = profile;
      return map;
    }, {});

    res.json({
      swipes: incomingSwipes.map(s => ({
        swipeId: s._id,
        fromUserId: s.fromUserId,
        fromUserProfile: profileMap[s.fromUserId.toString()] || null,
        swipedAt: s.swipedAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.acceptSwipe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { swipeId } = req.params;

    const swipe = await Swipe.findById(swipeId);
    if (!swipe) {
      return res.status(404).json({ error: 'Swipe not found' });
    }

    if (swipe.toUserId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (swipe.status !== 'pending') {
      return res.status(400).json({ error: 'Swipe already responded to' });
    }

    swipe.status = 'accepted';
    swipe.acceptedAt = new Date();
    await swipe.save();

    // Only an existing *like* counts as "already have a reverse swipe" for
    // the purposes of detecting a pre-existing decision — a stale 'pass'
    // shouldn't be treated as if the user had already liked this person.
    let reverseSwipe = await Swipe.findOne({
      fromUserId: userId,
      toUserId: swipe.fromUserId,
      direction: 'like'
    });

    if (!reverseSwipe) {
      try {
        reverseSwipe = await Swipe.create({
          fromUserId: userId,
          toUserId: swipe.fromUserId,
          direction: 'like',
          status: 'accepted',
          swipedAt: new Date(),
          acceptedAt: new Date()
        });
      } catch (err) {
        if (err.code === 11000) {
          // The unique (fromUserId, toUserId) index means only one Swipe
          // record can exist for this pair — it must be a prior 'pass' (a
          // 'like' would have matched the direction-scoped lookup above).
          // Explicitly accepting this incoming like is a deliberate decision
          // to reciprocate, so convert that record into an accepted like
          // rather than leaving a stale pass in place.
          reverseSwipe = await Swipe.findOne({ fromUserId: userId, toUserId: swipe.fromUserId });
          if (reverseSwipe) {
            reverseSwipe.direction = 'like';
            reverseSwipe.status = 'accepted';
            reverseSwipe.acceptedAt = new Date();
            await reverseSwipe.save();
          }
        } else {
          throw err;
        }
      }
    } else if (reverseSwipe.status === 'pending') {
      reverseSwipe.status = 'accepted';
      reverseSwipe.acceptedAt = new Date();
      await reverseSwipe.save();
    }

    let match = await Match.findOne({
      userIds: { $all: [userId, swipe.fromUserId] },
      status: 'active'
    });
    let matchAlreadyExisted = !!match;

    if (!match) {
      try {
        match = await Match.create({
          userIds: [userId, swipe.fromUserId],
          status: 'active',
          matchedAt: new Date()
        });
      } catch (err) {
        if (err.code === 11000) {
          match = await Match.findOne({
            userIds: { $all: [userId, swipe.fromUserId] },
            status: 'active'
          });
          matchAlreadyExisted = true;
        } else {
          throw err;
        }
      }
    }

    if (!matchAlreadyExisted) {
      await Notification.create({
        userId: swipe.fromUserId,
        type: 'match',
        title: 'Swipe accepted!',
        body: 'Your swipe was accepted and a new match was created.'
      });
    }

    res.json({
      swipeId: swipe._id,
      match: {
        matchId: match._id,
        message: 'Swipe accepted and match created.'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectSwipe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { swipeId } = req.params;

    const swipe = await Swipe.findById(swipeId);
    if (!swipe) {
      return res.status(404).json({ error: 'Swipe not found' });
    }

    if (swipe.toUserId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (swipe.status !== 'pending') {
      return res.status(400).json({ error: 'Swipe already responded to' });
    }

    swipe.status = 'rejected';
    swipe.rejectedAt = new Date();
    await swipe.save();

    // Only skip creating the reverse "pass" if we already explicitly passed
    // on them before — a prior 'like' from us must not block recording this
    // rejection, otherwise the rejection silently fails to be persisted.
    const existingPass = await Swipe.findOne({
      fromUserId: userId,
      toUserId: swipe.fromUserId,
      direction: 'pass'
    });

    if (!existingPass) {
      try {
        await Swipe.create({
          fromUserId: userId,
          toUserId: swipe.fromUserId,
          direction: 'pass',
          status: 'rejected',
          swipedAt: new Date(),
          rejectedAt: new Date()
        });
      } catch (err) {
        // A swipe (likely a still-pending 'like') already exists for this
        // pair; the unique (fromUserId,toUserId) index prevents a second
        // record. The explicit rejection above is still recorded on the
        // original swipe document, which is the important part.
        if (err.code !== 11000) {
          throw err;
        }
      }
    }

    await Notification.create({
      userId: swipe.fromUserId,
      type: 'system',
      title: 'Swipe rejected',
      body: 'Your swipe was rejected.'
    });

    res.json({
      swipeId: swipe._id,
      status: 'rejected',
      message: 'Swipe rejected.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Search colleges - full-text search
exports.searchColleges = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const colleges = await College.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { city: { $regex: query, $options: 'i' } }
      ]
    })
      .limit(parseInt(limit))
      .select('name city country');

    res.json({
      colleges,
      count: colleges.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
