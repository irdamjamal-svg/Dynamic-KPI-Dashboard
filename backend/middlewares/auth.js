const logger = require('../utils/logger');

// Ensure user is authenticated via Passport session
function ensureAuthenticated(req, res, next) {
  // Test bypass to simplify automated tests (only active in NODE_ENV=test)
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-auth'] === '1') {
    req.user = {
      role: req.headers['x-test-role'] || 'User',
      email: 'test@example.com',
      fullName: 'Test User',
    };
    return next();
  }

  try {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ message: 'Authentication required' });
  } catch (err) {
    logger.error('Auth check failed', { error: err.message });
    return res.status(401).json({ message: 'Authentication required' });
  }
}

// Restrict to specific roles
function authorizeRoles(...roles) {
  return (req, res, next) => {
    const role = req.user && req.user.role;
    if (!role) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient privileges' });
    }
    return next();
  };
}

module.exports = {
  ensureAuthenticated,
  authorizeRoles,
};
