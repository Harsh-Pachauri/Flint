const mongoose = require('mongoose');

const playroomSessionSchema = new mongoose.Schema({
  playroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playroom',
    required: true
  },
  gameType: {
    type: String,
    enum: ['dareRoulette', 'storyBuilding', 'wyouldYouRather'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  },
  currentRound: {
    type: Number,
    default: 1
  },
  currentTurnUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    sparse: true
  }
});

module.exports = mongoose.model('PlayroomSession', playroomSessionSchema);
