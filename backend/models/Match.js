const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  userIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  // Deterministic, order-independent key for a user pair (sorted, joined userIds).
  // Used with a partial unique index so concurrent/duplicate match-creation attempts
  // for the same pair collide at the database level instead of creating duplicates.
  pairKey: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active'
  },
  matchedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-compute pairKey from userIds so every creation path (swipe, accept, etc.)
// gets the same idempotency protection without having to remember to set it.
matchSchema.pre('validate', function computePairKey(next) {
  if (Array.isArray(this.userIds) && this.userIds.length === 2) {
    this.pairKey = this.userIds.map((id) => id.toString()).sort().join('_');
  }
  next();
});

// Only one ACTIVE match per pair at a time; archived/blocked duplicates from
// past unmatches are allowed to coexist (partial index scopes the constraint).
matchSchema.index(
  { pairKey: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

module.exports = mongoose.model('Match', matchSchema);
