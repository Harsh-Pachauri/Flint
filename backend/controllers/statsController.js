const { Confession, Reaction } = require('../models');

exports.getConfessionStats = async (req, res) => {
  try {
    const totalConfessions = await Confession.countDocuments({});
    const thisWeek = await Confession.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const topTags = await Confession.aggregate([
      { $match: { status: 'approved', tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const reactionSummary = await Reaction.aggregate([
      { $match: { targetType: 'confession' } },
      { $group: { _id: '$emoji', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    const anonymousCount = await Confession.countDocuments({ isAnonymous: true });
    const anonymousPercentage = totalConfessions
      ? Math.round((anonymousCount / totalConfessions) * 100)
      : 0;

    res.json({
      success: true,
      totalConfessions,
      thisWeek,
      topTags: topTags.map((tag) => tag._id),
      mostUsedReaction: reactionSummary.length ? reactionSummary[0]._id : null,
      anonymousPercentage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTrendingTags = async (req, res) => {
  try {
    const trendingTags = await Confession.aggregate([
      { $match: { status: 'approved', tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      tags: trendingTags.map((tag) => ({ tag: tag._id, count: tag.count }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
