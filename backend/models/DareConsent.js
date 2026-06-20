const mongoose = require('mongoose');

const dareConsentSchema = new mongoose.Schema({
  spinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DareSpin',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accepted: {
    type: Boolean,
    required: true
  },
  respondedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DareConsent', dareConsentSchema);
