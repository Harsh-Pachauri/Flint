const { Reaction, Confession } = require('../models');
const { isAdminUser } = require('../utils/adminAuth');

const updateConfessionReactionCounts = async (targetId, emoji, delta) => {
  if (!emoji) return;
  const confession = await Confession.findById(targetId);
  if (!confession) return;

  const current = confession.reactionSummary.get(emoji) || 0;
  const next = Math.max(0, current + delta);

  const update = { reactionCount: Math.max(0, confession.reactionCount + delta) };
  if (next === 0) {
    confession.reactionSummary.delete(emoji);
  } else {
    confession.reactionSummary.set(emoji, next);
  }

  confession.reactionCount = update.reactionCount;
  await confession.save();
};

exports.react = async (req, res) => {
  try {
    const { targetType, targetId, emoji } = req.body;

    if (!targetType || !['confession', 'poll', 'comment'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }
    if (!targetId) {
      return res.status(400).json({ error: 'targetId is required' });
    }
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const existing = await Reaction.findOne({
      user: req.user.userId,
      targetType,
      targetId
    });

    if (existing) {
      return res.status(400).json({ error: 'You have already reacted to this item' });
    }

    const reaction = new Reaction({
      user: req.user.userId,
      targetType,
      targetId,
      emoji: emoji.trim()
    });

    await reaction.save();
    if (targetType === 'confession') {
      await updateConfessionReactionCounts(targetId, emoji.trim(), 1);
    }

    res.status(201).json({ success: true, reaction });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate reaction' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.toggleReaction = async (req, res) => {
  try {
    const { targetType, targetId, emoji } = req.body;

    if (!targetType || !['confession', 'poll', 'comment'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }
    if (!targetId) {
      return res.status(400).json({ error: 'targetId is required' });
    }
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const existing = await Reaction.findOne({
      user: req.user.userId,
      targetType,
      targetId
    });

    const normalizedEmoji = emoji.trim();

    if (!existing) {
      let reaction;
      try {
        reaction = new Reaction({
          user: req.user.userId,
          targetType,
          targetId,
          emoji: normalizedEmoji
        });
        await reaction.save();
      } catch (err) {
        if (err.code === 11000) {
          // Lost a race with a concurrent identical toggle request — the
          // reaction already exists, treat this as a no-op add rather than
          // leaking a raw MongoDB duplicate-key error to the client.
          reaction = await Reaction.findOne({ user: req.user.userId, targetType, targetId });
          return res.status(200).json({ success: true, action: 'added', message: 'Reaction added', reaction });
        }
        throw err;
      }
      if (targetType === 'confession') {
        await updateConfessionReactionCounts(targetId, normalizedEmoji, 1);
      }
      // action: distinguishes a fresh add (net reaction-count delta +1) from
      // a swap below (net delta 0), so clients can update counts correctly.
      return res.status(201).json({ success: true, action: 'added', message: 'Reaction added', reaction });
    }

    if (existing.emoji === normalizedEmoji) {
      await existing.deleteOne();
      if (targetType === 'confession') {
        await updateConfessionReactionCounts(targetId, normalizedEmoji, -1);
      }
      return res.json({ success: true, action: 'removed', message: 'Reaction removed' });
    }

    const oldEmoji = existing.emoji;
    existing.emoji = normalizedEmoji;
    await existing.save();

    if (targetType === 'confession') {
      await updateConfessionReactionCounts(targetId, oldEmoji, -1);
      await updateConfessionReactionCounts(targetId, normalizedEmoji, 1);
    }

    res.json({ success: true, action: 'swapped', message: 'Reaction updated', reaction: existing });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate reaction' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.removeReaction = async (req, res) => {
  try {
    const reaction = await Reaction.findById(req.params.id);
    if (!reaction) {
      return res.status(404).json({ error: 'Reaction not found' });
    }

    const ownsReaction = reaction.user.toString() === req.user.userId;
    const isAdmin = await isAdminUser(req.user.userId);

    if (!ownsReaction && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const emoji = reaction.emoji;
    const targetType = reaction.targetType;
    const targetId = reaction.targetId;
    await reaction.deleteOne();

    if (targetType === 'confession') {
      await updateConfessionReactionCounts(targetId, emoji, -1);
    }

    res.json({ success: true, message: 'Reaction removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
