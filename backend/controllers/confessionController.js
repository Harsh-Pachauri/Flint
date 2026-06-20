const { Confession, User } = require('../models');

const isAdminUser = async (userId) => {
  const user = await User.findById(userId);
  return user && (
    user.email === 'flintdating@outlook.com' ||
    user.email === 'ph2005@gmail.com' ||
    user.email === 'hp@gmail.com' ||
    user.email === 'hp2005@example.com'
  );
};

const formatConfession = (confession, currentUserId) => {
  const isOwner = currentUserId && confession.author?.toString() === currentUserId.toString();
  const showAuthor = !confession.isAnonymous || isOwner;
   // 6a0050000354cd159572f175
  return {
    _id: confession._id,
    author: showAuthor ? confession.author : null,
    text: confession.text,
    isAnonymous: confession.isAnonymous,
    tags: confession.tags,
    reactions: confession.reactionSummary || {},
    reactionCount: confession.reactionCount || 0,
    commentsCount: confession.commentsCount || 0,
    status: confession.status,
    createdAt: confession.createdAt,
    updatedAt: confession.updatedAt
  };
};

exports.createConfession = async (req, res) => {
  try {
    const { text, isAnonymous = true, tags = [] } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const confession = new Confession({
      author: req.user.userId,
      text: text.trim(),
      isAnonymous: Boolean(isAnonymous),
      tags: Array.isArray(tags) ? tags.map((tag) => tag.trim()).filter(Boolean) : []
    });

    await confession.save();

    res.status(201).json({
      success: true,
      confession: formatConfession(confession, req.user.userId)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getConfessions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const tag = req.query.tag;
    const sortMode = req.query.sort;

    const filter = { status: 'approved' };
    if (tag) {
      filter.tags = tag;
    }

    const sort = sortMode === 'trending'
      ? { reactionCount: -1, createdAt: -1 }
      : { createdAt: -1 };

    const [confessions, total] = await Promise.all([
      Confession.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Confession.countDocuments(filter)
    ]);

    res.json({
      success: true,
      confessions: confessions.map((confession) => formatConfession(confession, req.user.userId)),
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

exports.getConfessionById = async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.id).lean();
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found' });
    }

    const ownsConfession = confession.author.toString() === req.user.userId;
    const isAdmin = await isAdminUser(req.user.userId);

    if (confession.status !== 'approved' && !ownsConfession && !isAdmin) {
      return res.status(404).json({ error: 'Confession not found' });
    }

    res.json({ success: true, confession: formatConfession(confession, req.user.userId) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyConfessions = async (req, res) => {
  try {
    const confessions = await Confession.find({ author: req.user.userId }).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      confessions: confessions.map((confession) => formatConfession(confession, req.user.userId))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteConfession = async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found' });
    }

    const ownsConfession = confession.author.toString() === req.user.userId;
    const isAdmin = await isAdminUser(req.user.userId);

    if (!ownsConfession && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await confession.deleteOne();

    res.json({ success: true, message: 'Confession deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateConfession = async (req, res) => {
  try {
    const confession = await Confession.findById(req.params.id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found' });
    }

    const ownsConfession = confession.author.toString() === req.user.userId;
    const isAdmin = await isAdminUser(req.user.userId);

    if (!ownsConfession && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { text, tags, isAnonymous } = req.body;
    const updates = {};

    if (typeof text === 'string' && text.trim()) updates.text = text.trim();
    if (typeof isAnonymous === 'boolean') updates.isAnonymous = isAnonymous;
    if (Array.isArray(tags)) updates.tags = tags.map((tag) => tag.trim()).filter(Boolean);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    Object.assign(confession, updates);
    await confession.save();

    res.json({ success: true, confession: formatConfession(confession, req.user.userId) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTrendingConfessions = async (req, res) => {
  try {
    const confessions = await Confession.find({ status: 'approved' })
      .sort({ reactionCount: -1, createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      confessions: confessions.map((confession) => formatConfession(confession, req.user.userId))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPendingConfessions = async (req, res) => {
  try {
    const isAdmin = await isAdminUser(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const confessions = await Confession.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      confessions: confessions.map((confession) => formatConfession(confession, req.user.userId))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approveConfession = async (req, res) => {
  try {
    const isAdmin = await isAdminUser(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const confession = await Confession.findById(req.params.id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found' });
    }

    confession.status = 'approved';
    await confession.save();

    res.json({ success: true, message: 'Confession approved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectConfession = async (req, res) => {
  try {
    const isAdmin = await isAdminUser(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const confession = await Confession.findById(req.params.id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found' });
    }

    confession.status = 'rejected';
    await confession.save();

    res.json({ success: true, message: 'Confession rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
