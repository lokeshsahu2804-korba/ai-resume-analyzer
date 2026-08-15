/**
 * Global Error Handling Middleware (error.middleware.js)
 * Intercepts all operational and unhandled exceptions, formatting uniform JSON error responses.
 */

const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'record';
    error = ApiError.conflict(`Duplicate ${field} detected. An active record already exists.`);
  } else if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.code || 'INTERNAL_ERROR', error.details || null);
  }

  // Log unexpected or server-level errors
  if (error.statusCode >= 500) {
    logger.error(`[${req.method} ${req.originalUrl}] Server Error: ${error.message}`, err);
  } else {
    logger.warn(`[${req.method} ${req.originalUrl}] Client Error (${error.statusCode}): ${error.message}`);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    timestamp: new Date().toISOString()
  };

  return res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
