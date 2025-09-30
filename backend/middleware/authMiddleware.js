const logger = require('../utils/logger');

/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = (req, res, next) => {
  try {
    if (req.isAuthenticated && req.isAuthenticated()) {
      logger.info(`Authenticated user: ${req.user.email || 'unknown'}`);
      return next();
    }

    logger.warn('Unauthorized access attempt - User not authenticated');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required. Please log in.',
    });
  } catch (error) {
    logger.error(`Authentication check failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication check failed.',
    });
  }
};

/**
 * Middleware to check if user has required role(s)
 * @param {string|Array<string>} allowedRoles - Single role or array of allowed roles
 */
const hasRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        logger.warn('Role check failed - No user in request');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required.',
        });
      }

      const userRole = req.user.role;
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      if (roles.includes(userRole)) {
        logger.info(`Role check passed - User: ${req.user.email}, Role: ${userRole}`);
        return next();
      }

      logger.warn(
        `Forbidden access - User: ${req.user.email}, Role: ${userRole}, Required: ${roles.join(', ')}`
      );

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource.',
        requiredRole: roles,
        userRole: userRole,
      });
    } catch (error) {
      logger.error(`Role check failed: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Role verification failed.',
      });
    }
  };
};

/**
 * Middleware to check if user is admin
 */
const isAdmin = hasRole(['admin', 'Admin', 'ADMIN']);

/**
 * Middleware to check if user is manager or admin
 */
const isManagerOrAdmin = hasRole(['manager', 'Manager', 'admin', 'Admin']);

/**
 * Mock authentication middleware for testing
 * This should only be used in test environment
 */
const mockAuth = (role = 'admin') => {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      req.user = {
        _id: 'test-user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        role: role,
      };
      req.isAuthenticated = () => true;
      return next();
    }
    next();
  };
};

module.exports = {
  isAuthenticated,
  hasRole,
  isAdmin,
  isManagerOrAdmin,
  mockAuth,
};
