/**
 * Authentication Middleware (middleware/auth.middleware.js)
 * Verifies JWT from httpOnly cookie or Authorization Bearer header and attaches req.user.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Express middleware requiring a valid JWT session.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  let token = null;

  // 1. Check for token in httpOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Fallback check for Authorization Bearer header (for automated testing or API clients)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 3. Reject if no token is found
  if (!token) {
    throw ApiError.unauthorized('Authentication required. Please log in to continue.');
  }

  // 4. Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Your authentication session has expired. Please log in again.');
    }
    throw ApiError.unauthorized('Invalid authentication token. Please log in again.');
  }

  // 5. Lookup user in database
  const user = await User.findById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized('The user account associated with this session no longer exists.');
  }

  // 6. Attach authenticated user to request object
  req.user = user;
  next();
});

module.exports = {
  requireAuth
};
