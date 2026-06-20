const { Profile, Swipe, College, Match, Notification } = require('../models');

// Get discovery feed - paginated with random filtering
exports.getFeed = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { college } = req.query;
    // parse pagination params safely (req.query values are strings when present)
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    // Get current user's profile for gender preferences
    const userProfile = await Profile.findOne({ userId });

    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Get IDs of already-swiped users
    const swipedUsers = await Swipe.find({ fromUserId: userId }).select('toUserId');
    const swipedUserIds = swipedUsers.map(s => s.toUserId.toString());

    // Get IDs of already matched users
    const matchedDocs = await Match.find({ userIds: userId, status: 'active' }).select('userIds');
    const matchedUserIds = matchedDocs
      .flatMap(m => m.userIds.map(u => u.toString()))
      .filter(id => id !== userId);

    // Build aggregation pipeline for random order with filtering
    let pipeline = [
      {
        $match: {
          userId: { $ne: userId, $nin: [...swipedUserIds, ...matchedUserIds] },
          gender: userProfile.genderPreference !== 'both' ? userProfile.genderPreference : { $exists: true }
        }
      }
    ];

    // Add college filter if requested
    if (college && userProfile.collegeId) {
      pipeline[0].$match.collegeId = userProfile.collegeId;
    }

    // Add randomization
    pipeline.push({ $sample: { size: Math.min(limit * 5, 1000) } });

    // Add pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Add lookup for collegeId
    pipeline.push({
      $lookup: {
        from: 'colleges',
        localField: 'collegeId',
        foreignField: '_id',
        as: 'collegeId'
      }
    });

    // Unwind collegeId to maintain structure
    pipeline.push({
      $unwind: {
        path: '$collegeId',
        preserveNullAndEmptyArrays: true
      }
    });

    // Project fields
    pipeline.push({
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
    });

    // Fetch profiles using aggregation
    const profiles = await Profile.aggregate(pipeline);

    // Count total for pagination
    const countPipeline = [
      {
        $match: {
          userId: { $ne: userId, $nin: [...swipedUserIds, ...matchedUserIds] },
          gender: userProfile.genderPreference !== 'both' ? userProfile.genderPreference : { $exists: true }
        }
      },
      { $count: 'total' }
    ];

    if (college && userProfile.collegeId) {
      countPipeline[0].$match.collegeId = userProfile.collegeId;
    }

    const countResult = await Profile.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

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

// Record a swipe - left or right
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

    // Create swipe record
    const swipe = new (require('../models').Swipe)({
      fromUserId: userId,
      toUserId,
      direction,
      swipedAt: new Date()
    });

    await swipe.save();

    let match = null;

    // If right swipe, check for mutual match
    if (direction === 'like') {
      const reverseSwipe = await Swipe.findOne({
        fromUserId: toUserId,
        toUserId: userId,
        direction: 'like'
      });

      if (reverseSwipe) {
        // Create match when both users liked each other
        match = new Match({
          userIds: [userId, toUserId],
          status: 'active',
          matchedAt: new Date()
        });
        await match.save();

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

        console.log(`Match created between ${userId} and ${toUserId}`);
      } else {
        await Notification.create({
          userId: toUserId,
          type: 'like',
          title: 'New swipe received',
          body: 'Someone liked your profile. View your incoming swipes to accept or reject.'
        });
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

    let reverseSwipe = await Swipe.findOne({
      fromUserId: userId,
      toUserId: swipe.fromUserId
    });

    if (!reverseSwipe) {
      reverseSwipe = new Swipe({
        fromUserId: userId,
        toUserId: swipe.fromUserId,
        direction: 'like',
        status: 'accepted',
        swipedAt: new Date(),
        acceptedAt: new Date()
      });
      await reverseSwipe.save();
    } else if (reverseSwipe.status === 'pending') {
      reverseSwipe.status = 'accepted';
      reverseSwipe.acceptedAt = new Date();
      await reverseSwipe.save();
    }

    let match = await Match.findOne({
      userIds: { $all: [userId, swipe.fromUserId] },
      status: 'active'
    });

    if (!match) {
      match = new Match({
        userIds: [userId, swipe.fromUserId],
        status: 'active',
        matchedAt: new Date()
      });
      await match.save();
    }

    await Notification.create({
      userId: swipe.fromUserId,
      type: 'match',
      title: 'Swipe accepted!',
      body: 'Your swipe was accepted and a new match was created.'
    });

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

    const existingPass = await Swipe.findOne({
      fromUserId: userId,
      toUserId: swipe.fromUserId
    });

    if (!existingPass) {
      await Swipe.create({
        fromUserId: userId,
        toUserId: swipe.fromUserId,
        direction: 'pass',
        status: 'rejected',
        swipedAt: new Date(),
        rejectedAt: new Date()
      });
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
