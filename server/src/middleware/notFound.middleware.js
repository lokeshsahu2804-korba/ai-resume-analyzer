/**
 * 404 Not Found Middleware (notFound.middleware.js)
 * Catches all unmatched routes and creates a structured 404 ApiError.
 */

const ApiError = require('../utils/ApiError');

const notFoundHandler = (req, res, next) => {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  next(new ApiError(404, message, 'NOT_FOUND'));
};

module.exports = notFoundHandler;
