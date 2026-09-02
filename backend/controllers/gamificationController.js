const { Reward, NewsFeed, Notification } = require('../models');

// Claim daily reward
exports.claimReward = async (req, res) => {
  try {
    const userId = req.user.userId;

    let reward = await Reward.findOne({ userId });

    if (!reward) {
      reward = new Reward({
        userId,
        currentStreak: 0,
        totalPoints: 0
      });
    }

    const now = new Date();
    const lastClaimed = reward.lastClaimedAt ? new Date(reward.lastClaimedAt) : null;

    // Check if reward already claimed today
    if (lastClaimed) {
      const daysSinceLastClaim = Math.floor((now - lastClaimed) / (1000 * 60 * 60 * 24));

      if (daysSinceLastClaim === 0) {
        return res.status(400).json({
          error: 'Reward already claimed today',
          nextClaimTime: new Date(lastClaimed.getTime() + 24 * 60 * 60 * 1000)
        });
      }

      // Reset streak if more than 48 hours
      if (daysSinceLastClaim > 2) {
        reward.currentStreak = 1;
      } else if (daysSinceLastClaim === 1) {
        // Continue streak if claimed yesterday
        reward.currentStreak += 1;
      }
    } else {
      reward.currentStreak = 1;
    }

    // Award points based on streak
    const pointsPerDay = 10;
    const streakBonus = reward.currentStreak >= 7 ? 50 : reward.currentStreak >= 3 ? 25 : 0;
    const newPoints = pointsPerDay + streakBonus;

    reward.totalPoints += newPoints;
    reward.lastClaimedAt = now;

    await reward.save();

    res.json({
      rewardId: reward._id,
      pointsAwarded: newPoints,
      totalPoints: reward.totalPoints,
      currentStreak: reward.currentStreak,
      streakBonus: streakBonus,
      message: `Claimed ${newPoints} points!`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get own reward & streak status
exports.getRewardStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const reward = await Reward.findOne({ userId });

    if (!reward) {
      return res.json({
        currentStreak: 0,
        totalPoints: 0,
        claimable: true,
        message: 'No rewards yet'
      });
    }

    const now = new Date();
    const lastClaimed = reward.lastClaimedAt ? new Date(reward.lastClaimedAt) : null;

    let claimable = true;
    let nextClaimTime = null;

    if (lastClaimed) {
      const hoursSinceLastClaim = (now - lastClaimed) / (1000 * 60 * 60);

      if (hoursSinceLastClaim < 24) {
        claimable = false;
        nextClaimTime = new Date(lastClaimed.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    res.json({
      rewardId: reward._id,
      currentStreak: reward.currentStreak,
      totalPoints: reward.totalPoints,
      lastClaimedAt: reward.lastClaimedAt,
      claimable,
      nextClaimTime,
      hoursUntilNextClaim: claimable ? 0 : Math.ceil((nextClaimTime - now) / (1000 * 60 * 60))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get news feed - filtered by user interests
exports.getNewsFeed = async (req, res) => {
  try {
    const { tags, page = 1, limit = 10 } = req.query;

    let query = {};

    // Filter by tags if provided
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    // Optional: Filter by category
    const categories = ['tips', 'news', 'announcement', 'feature'];
    query.category = { $in: categories };

    const skip = (page - 1) * limit;

    const newsFeed = await NewsFeed.find(query)
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('title body tags category publishedAt');

    const total = await NewsFeed.countDocuments(query);

    res.json({
      feeds: newsFeed,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// List notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { unread, limit = 20, page = 1 } = req.query;

    let query = { userId };

    if (unread === 'true') {
      query.read = false;
    }

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Notification.countDocuments(query);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount: await Notification.countDocuments({ userId, read: false })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notifId } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: notifId, userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      notificationId: notification._id,
      read: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark all notifications as read (batch)
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );

    res.json({
      updatedCount: result.modifiedCount,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
