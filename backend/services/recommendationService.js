const { Profile, Swipe, Match, Interaction } = require('../models');
const mongoose = require('mongoose');

const arrayIntersectionSize = (a = [], b = []) => {
  const setB = new Set(b || []);
  return (a || []).filter(item => setB.has(item)).length;
};

const safeDivide = (numerator, denominator) => {
  return denominator === 0 ? 0 : numerator / denominator;
};

const toObjectId = id => {
  try {
    return mongoose.Types.ObjectId(id);
  } catch {
    return null;
  }
};

const getDistanceKm = (coordA, coordB) => {
  if (!Array.isArray(coordA) || !Array.isArray(coordB) || coordA.length !== 2 || coordB.length !== 2) {
    return null;
  }

  const [lon1, lat1] = coordA;
  const [lon2, lat2] = coordB;
  const toRad = degrees => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

const normalizeScore = value => Math.max(0, Math.min(1, value));

const getProfileTraits = profile => {
  if (Array.isArray(profile?.personality?.traits)) {
    return profile.personality.traits;
  }
  if (Array.isArray(profile?.personalityTraits)) {
    return profile.personalityTraits;
  }
  return [];
};

const buildContentScore = (userProfile, candidate) => {
  const userInterests = Array.isArray(userProfile.interests) ? userProfile.interests : [];
  const candidateInterests = Array.isArray(candidate.interests) ? candidate.interests : [];
  const interestOverlap = arrayIntersectionSize(userInterests, candidateInterests);
  const interestTotal = Math.max(userInterests.length, candidateInterests.length, 1);
  const interestScore = interestOverlap / interestTotal;

  const userTraits = getProfileTraits(userProfile);
  const candidateTraits = getProfileTraits(candidate);
  const traitOverlap = arrayIntersectionSize(userTraits, candidateTraits);
  const traitTotal = Math.max(userTraits.length, candidateTraits.length, 1);
  const traitScore = traitOverlap / traitTotal;

  const branchScore = userProfile.branch && candidate.branch && userProfile.branch === candidate.branch ? 1 : 0;

  return normalizeScore(
    interestScore * 0.55 +
    traitScore * 0.30 +
    branchScore * 0.15
  );
};

const buildContextScore = (userProfile, candidate) => {
  const distanceKm = getDistanceKm(userProfile.location?.coordinates, candidate.location?.coordinates);
  const distanceScore = distanceKm === null ? 0 : normalizeScore(1 - Math.min(distanceKm / 50, 1));
  const branchBoost = userProfile.branch && candidate.branch && userProfile.branch === candidate.branch ? 1 : 0;
  return normalizeScore(distanceScore * 0.75 + branchBoost * 0.25);
};

const buildBehaviorScore = (candidateId, summary, viewedIds) => {
  const candidateStats = summary[candidateId] || { likes: 0, passes: 0, total: 0 };
  const likeRatio = safeDivide(candidateStats.likes, candidateStats.likes + candidateStats.passes);
  const frequencyScore = normalizeScore(candidateStats.total / 20);
  const viewBoost = viewedIds.has(candidateId) ? 0.1 : 0;
  return normalizeScore(likeRatio * 0.65 + frequencyScore * 0.25 + viewBoost);
};

const buildCollaborativeScore = (candidateId, candidateLikesBySimilarUsers, similarUserCount) => {
  if (similarUserCount === 0) return 0;
  const count = candidateLikesBySimilarUsers[candidateId] || 0;
  return normalizeScore(count / similarUserCount);
};

const aggregateSwipeSummary = async candidateIds => {
  if (!candidateIds.length) return {};

  const groups = await Swipe.aggregate([
    {
      $match: {
        toUserId: { $in: candidateIds }
      }
    },
    {
      $group: {
        _id: '$toUserId',
        likes: {
          $sum: {
            $cond: [{ $eq: ['$direction', 'like'] }, 1, 0]
          }
        },
        passes: {
          $sum: {
            $cond: [{ $eq: ['$direction', 'pass'] }, 1, 0]
          }
        },
        total: { $sum: 1 }
      }
    }
  ]);

  return groups.reduce((memo, item) => {
    memo[item._id.toString()] = {
      likes: item.likes,
      passes: item.passes,
      total: item.total
    };
    return memo;
  }, {});
};

const getRecommendations = async (userId, options = {}) => {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(Math.max(1, parseInt(options.limit, 10) || 20), 50);
  const skip = (page - 1) * limit;
  const maxCandidates = 200;

  const userProfile = await Profile.findOne({ userId }).lean();
  if (!userProfile) {
    throw new Error('User profile not found');
  }

  userProfile.interests = Array.isArray(userProfile.interests) ? userProfile.interests : [];
  userProfile.location = userProfile.location || { type: 'Point', coordinates: [] };

  const swipedDocs = await Swipe.find({ fromUserId: userId }).select('toUserId direction');
  const swipedUserIds = swipedDocs.map(doc => doc.toUserId.toString());
  const likedUserIds = swipedDocs
    .filter(doc => doc.direction === 'like')
    .map(doc => doc.toUserId.toString());

  const matchedDocs = await Match.find({ userIds: userId, status: 'active' }).select('userIds');
  const matchedUserIds = matchedDocs
    .flatMap(m => m.userIds.map(id => id.toString()))
    .filter(id => id !== userId.toString());

  const excludeIds = new Set([userId.toString(), ...swipedUserIds, ...matchedUserIds]);

  const ageMin = Math.max(18, userProfile.age - 3);
  const ageMax = userProfile.age + 3;

  const query = {
    userId: { $nin: Array.from(excludeIds) },
    age: { $gte: ageMin, $lte: ageMax }
  };

  if (userProfile.genderPreference && userProfile.genderPreference !== 'both') {
    query.gender = userProfile.genderPreference;
  }

  if (userProfile.collegeId) {
    query.collegeId = userProfile.collegeId;
  }

  const candidates = await Profile.find(query)
    .limit(maxCandidates)
    .lean();

  const candidateIds = candidates.map(profile => profile.userId.toString());
  const candidateIdSet = new Set(candidateIds);

  const candidateStats = await aggregateSwipeSummary(candidateIds.map(toObjectId).filter(Boolean));

  const viewInteractions = await Interaction.find({
    fromUserId: userId,
    action: 'view',
    toUserId: { $in: candidateIds.map(toObjectId).filter(Boolean) }
  }).select('toUserId');
  const viewedIds = new Set(viewInteractions.map(i => i.toUserId.toString()));

  let similarUserIds = [];
  if (likedUserIds.length) {
    const similarLikes = await Swipe.find({
      toUserId: { $in: likedUserIds.map(toObjectId).filter(Boolean) },
      direction: 'like',
      fromUserId: { $ne: userId }
    }).select('fromUserId');

    similarUserIds = [...new Set(similarLikes.map(doc => doc.fromUserId.toString()))];
  }

  const candidateLikesBySimilarUsers = {};
  if (similarUserIds.length) {
    const similarUserLikes = await Swipe.find({
      fromUserId: { $in: similarUserIds.map(toObjectId).filter(Boolean) },
      direction: 'like',
      toUserId: { $in: candidateIds.map(toObjectId).filter(Boolean) }
    }).select('toUserId');

    similarUserLikes.forEach(like => {
      const candidateKey = like.toUserId.toString();
      candidateLikesBySimilarUsers[candidateKey] = (candidateLikesBySimilarUsers[candidateKey] || 0) + 1;
    });
  }

  const scoredCandidates = candidates.map(candidate => {
    const candidateId = candidate.userId.toString();
    const contentScore = buildContentScore(userProfile, candidate);
    const collaborativeScore = buildCollaborativeScore(candidateId, candidateLikesBySimilarUsers, similarUserIds.length);
    const behaviorScore = buildBehaviorScore(candidateId, candidateStats, viewedIds);
    const contextScore = buildContextScore(userProfile, candidate);

    const finalScore =
      0.35 * contentScore +
      0.30 * collaborativeScore +
      0.25 * behaviorScore +
      0.10 * contextScore;

    return {
      profile: candidate,
      score: Number(finalScore.toFixed(4)),
      breakdown: {
        contentScore: Number(contentScore.toFixed(4)),
        collaborativeScore: Number(collaborativeScore.toFixed(4)),
        behaviorScore: Number(behaviorScore.toFixed(4)),
        contextScore: Number(contextScore.toFixed(4))
      }
    };
  });

  const sorted = scoredCandidates
    .sort((a, b) => b.score - a.score)
    .slice(skip, skip + limit);

  return {
    userId: userId.toString(),
    page,
    limit,
    totalCandidates: scoredCandidates.length,
    recommendations: sorted
  };
};

module.exports = {
  getRecommendations
};
