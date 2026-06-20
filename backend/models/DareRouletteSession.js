const mongoose = require('mongoose');

const dareRouletteSessionSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlayroomSession',
    required: true
  },
  skipTokensUser1: {
    type: Number,
    default: 2
  },
  skipTokensUser2: {
    type: Number,
    default: 2
  },
  totalRounds: {
    type: Number,
    default: 10
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  }
});

module.exports = mongoose.model('DareRouletteSession', dareRouletteSessionSchema);
