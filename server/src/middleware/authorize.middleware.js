/**
 * Role-Based Authorization Middleware (middleware/authorize.middleware.js)
 * Restricts route access based on user role (e.g. 'admin').
 */

const ApiError = require('../utils/ApiError');

/**
 * Creates an authorization middleware checking if req.user has one of the allowed roles.
 *
 * @param {...string} allowedRoles - Allowed roles (e.g. 'admin', 'user')
 * @returns {Function} Express middleware
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      ApiError.forbidden('Access denied. You do not have permission to access this resource.')
    );
  }

  next();
};

module.exports = {
  requireRole
};
