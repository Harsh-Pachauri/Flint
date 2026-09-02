// middleware/validateObjectIdParam.js
//
// Shared guard for routes with an :id-shaped param that gets passed straight
// into a Mongoose findById/findOne. Without this, a malformed id (typo,
// stale bookmark, client bug) throws a Mongoose CastError that every
// controller's generic catch block turns into a confusing 500, instead of
// the 400 a bad client input actually deserves.
//
// Usage: router.get('/matches/:matchId', authMiddleware, validateObjectIdParam('matchId'), controller)
const mongoose = require('mongoose');

const validateObjectIdParam = (paramName) => (req, res, next) => {
  const value = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({ error: `Invalid ${paramName}` });
  }
  next();
};

module.exports = validateObjectIdParam;
