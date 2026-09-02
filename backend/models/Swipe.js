const mongoose = require('mongoose');

const swipeSchema = new mongoose.Schema({
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  direction: {
    type: String,
    enum: ['like', 'pass'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  acceptedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  swipedAt: {
    type: Date,
    default: Date.now
  }
});

// A user can only have one recorded swipe decision per target — this is what
// acceptSwipe/rejectSwipe already assumed (`findOne({fromUserId, toUserId})`)
// but nothing previously enforced. Prevents duplicate Swipe rows from repeated
// swipe requests (double-clicks, retries, concurrent requests).
swipeSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

module.exports = mongoose.model('Swipe', swipeSchema);
