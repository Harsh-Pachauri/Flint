const mongoose = require('mongoose');

const playroomSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  spiceLevel: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    default: 1
  },
  unlockedFeatures: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Playroom', playroomSchema);
