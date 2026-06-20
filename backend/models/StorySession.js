const mongoose = require('mongoose');

const storySessionSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlayroomSession',
    required: true
  },
  vibe: {
    type: String,
    enum: ['romantic', 'funny', 'spicy', 'adventure'],
    required: true
  },
  maxSentences: {
    type: Number,
    default: 20
  },
  currentPosition: {
    type: Number,
    default: 0
  },
  currentTurnUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  stalledCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  }
});

module.exports = mongoose.model('StorySession', storySessionSchema);
