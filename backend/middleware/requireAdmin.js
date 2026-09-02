// middleware/requireAdmin.js
//
// Express middleware for routes that are admin-only (no "owner OR admin"
// mixed logic — see utils/adminAuth.js's isAdminUser for that case, used
// inline in controllers that need it). Must run after authMiddleware so
// req.user is populated.
const { isAdminUser } = require('../utils/adminAuth');

const requireAdmin = async (req, res, next) => {
  try {
    const isAdmin = await isAdminUser(req.user && req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = requireAdmin;
