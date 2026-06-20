const mongoose = require('mongoose');
const { Comment, Confession, Poll, User } = require('../models');

const targetModels = {
  confession: Confession,
  poll: Poll
};

const isAdminUser = async (userId) => {
  const user = await User.findById(userId);
  return user && user.email === 'flintdating@outlook.com';
};

exports.addComment = async (req, res) => {
  try {
    const { targetType, targetId, parentCommentId, text } = req.body;

    if (!targetType || !['confession', 'poll'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    if (!targetId) {
      return res.status(400).json({ error: 'targetId is required' });
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const Model = targetModels[targetType];
    const target = await Model.findById(targetId);
    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }

    if (targetType === 'confession' && target.status !== 'approved') {
      return res.status(400).json({ error: 'Cannot comment on an unapproved confession' });
    }

    let parentComment = null;
    if (parentCommentId) {
      if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
        return res.status(400).json({ error: 'Invalid parentCommentId' });
      }

      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }

      if (parentComment.targetType !== targetType || parentComment.targetId.toString() !== targetId) {
        return res.status(400).json({ error: 'Parent comment does not belong to the specified target' });
      }
    }

    const comment = new Comment({
      author: req.user.userId,
      targetType,
      targetId,
      parentComment: parentCommentId || undefined,
      text: text.trim()
    });

    await comment.save();

    if (targetType === 'confession') {
      await Confession.findByIdAndUpdate(targetId, { $inc: { commentsCount: 1 } });
    }

    res.status(201).json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { targetType, targetId } = req.query;

    if (!targetType || !['confession', 'poll'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    if (!targetId) {
      return res.status(400).json({ error: 'targetId is required' });
    }

    const comments = await Comment.find({ targetType, targetId }).sort({ createdAt: 1 }).lean();
    const commentMap = new Map();
    const threaded = [];

    comments.forEach((comment) => {
      comment.replies = [];
      commentMap.set(comment._id.toString(), comment);
    });

    comments.forEach((comment) => {
      if (comment.parentComment) {
        const parent = commentMap.get(comment.parentComment.toString());
        if (parent) {
          parent.replies.push(comment);
          return;
        }
      }
      threaded.push(comment);
    });

    res.json({ success: true, comments: threaded });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const ownsComment = comment.author.toString() === req.user.userId;
    const isAdmin = await isAdminUser(req.user.userId);
    if (!ownsComment && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await comment.deleteOne();

    if (comment.targetType === 'confession') {
      await Confession.findByIdAndUpdate(comment.targetId, { $inc: { commentsCount: -1 } });
    }

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
