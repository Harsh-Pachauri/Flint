const mongoose = require('mongoose');

const wyrSessionSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlayroomSession',
    required: true
  },
  totalQuestions: {
    type: Number,
    default: 10
  },
  syncScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  syncBadge: {
    type: String,
    sparse: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  }
});

module.exports = mongoose.model('WYRSession', wyrSessionSchema);
