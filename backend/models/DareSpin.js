const mongoose = require('mongoose');

const dareSpinSchema = new mongoose.Schema({
  drSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DareRouletteSession',
    required: true
  },
  spinByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  landedCategory: {
    type: String,
    enum: ['dare', 'truth', 'challenge'],
    required: true
  },
  roundNumber: {
    type: Number,
    required: true
  },
  spunAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DareSpin', dareSpinSchema);
