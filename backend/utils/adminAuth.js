// utils/adminAuth.js
//
// Single source of truth for "is this user an admin?" — replaces four
// separately-duplicated (and already inconsistent) hardcoded email
// whitelists that used to live independently in confessionController.js,
// pollController.js, commentController.js, and reactionController.js.
//
// Authorization is now based on User.role (already defined on the User
// schema) rather than an email whitelist baked into source code.
const { User } = require('../models');

const isAdminUser = async (userId) => {
  if (!userId) return false;
  const user = await User.findById(userId).select('role');
  return !!user && user.role === 'admin';
};

module.exports = { isAdminUser };
