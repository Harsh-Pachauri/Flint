const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    required: true,
    enum: ['confession', 'poll', 'comment']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  emoji: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

reactionSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Reaction', reactionSchema);
