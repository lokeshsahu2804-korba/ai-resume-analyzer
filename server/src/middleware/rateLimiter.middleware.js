/**
 * API Rate Limiting Middleware (rateLimiter.middleware.js)
 * Protects endpoints from abuse, DoS, and automated credential stuffing attacks.
 */

const { rateLimit } = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: isDev ? 5000 : (parseInt(process.env.RATE_LIMIT_MAX, 10) || 100), // 5000 in dev/test, 100 in prod
  standardHeaders: true, // Return standard RateLimit headers in response
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many requests from this IP, please try again in 15 minutes', 'RATE_LIMIT_EXCEEDED'));
  }
});

// Strict Rate Limiter for Auth Routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 20, // 1000 in dev/test, 20 in prod
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many authentication attempts, please try again later', 'AUTH_RATE_LIMIT_EXCEEDED'));
  }
});

module.exports = {
  apiLimiter,
  authLimiter
};
