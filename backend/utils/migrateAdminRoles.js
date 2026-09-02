// utils/migrateAdminRoles.js
//
// One-time, idempotent migration: admin authorization used to be a set of
// four separately hardcoded (and already out-of-sync) email whitelists
// scattered across confessionController.js, pollController.js,
// commentController.js, and reactionController.js. Authorization now runs
// off User.role instead (see utils/adminAuth.js). This migration ensures
// anyone who previously had admin access via any of those old whitelists
// keeps it, by promoting matching accounts to role: 'admin' if they exist
// and aren't already set. Safe to run on every startup — it only ever sets
// role forward to 'admin' for this specific known list, never touches any
// other user, and does nothing once already applied.
const { User } = require('../models');

// Union of every email that appeared in any of the four previous
// hardcoded whitelists.
const PREVIOUSLY_WHITELISTED_ADMIN_EMAILS = [
  'flintdating@outlook.com',
  'ph2005@gmail.com',
  'hp@gmail.com',
  'hp2005@example.com'
];

async function migrateAdminRoles() {
  try {
    const result = await User.updateMany(
      { email: { $in: PREVIOUSLY_WHITELISTED_ADMIN_EMAILS }, role: { $ne: 'admin' } },
      { $set: { role: 'admin' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✓ Admin role migration: promoted ${result.modifiedCount} account(s) from the legacy email whitelist`);
    }
  } catch (error) {
    console.error(`✗ Admin role migration failed: ${error.message}`);
  }
}

module.exports = migrateAdminRoles;
