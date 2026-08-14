/**
 * Subscription Tier Authorization Middleware (middleware/premium.middleware.js)
 * Restricts advanced features to users with an active premium plan or admin status.
 */

const ApiError = require('../utils/ApiError');

const requirePremium = (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  // Admins bypass premium restriction; regular users must have plan === 'premium'
  if (req.user.role === 'admin' || req.user.plan === 'premium') {
    return next();
  }

  return next(
    ApiError.forbidden('This feature requires an active Pro subscription. Please upgrade your plan.')
  );
};

module.exports = {
  requirePremium
};
