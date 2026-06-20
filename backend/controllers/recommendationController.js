const recommendationService = require('../services/recommendationService');

exports.getRecommendations = async (req, res) => {
  try {
    const authenticatedUserId = req.user.userId;
    const targetUserId = req.params.userId;

    if (targetUserId !== authenticatedUserId.toString()) {
      return res.status(403).json({ error: 'Access denied to requested recommendations' });
    }

    const { page, limit } = req.query;
    const recommendations = await recommendationService.getRecommendations(authenticatedUserId, {
      page,
      limit
    });

    const formatted = recommendations.recommendations.map(item => ({
      score: item.score,
      breakdown: item.breakdown,
      profile: {
        userId: item.profile.userId,
        name: item.profile.name,
        age: item.profile.age,
        gender: item.profile.gender,
        collegeId: item.profile.collegeId,
        branch: item.profile.branch,
        year: item.profile.year,
        interests: item.profile.interests,
        personality: item.profile.personality || { traits: item.profile.personalityTraits || [] },
        location: item.profile.location,
        photos: item.profile.photos
      }
    }));

    return res.json({
      userId: recommendations.userId,
      page: recommendations.page,
      limit: recommendations.limit,
      totalCandidates: recommendations.totalCandidates,
      recommendedProfiles: formatted
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
