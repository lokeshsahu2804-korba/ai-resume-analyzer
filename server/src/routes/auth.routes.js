/**
 * Authentication Routes (auth.routes.js)
 * Signup, login, logout, and token management endpoints (Auth logic implemented in Phase 5).
 */

const express = require('express');
const router = express.Router();
const validate = require('../middleware/validate.middleware');
const { signupSchema, loginSchema } = require('../validators/auth.validator');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user account (Validation active, controller stub for Phase 5)
 * @access  Public
 */
router.post(
  '/signup',
  authLimiter,
  validate(signupSchema),
  asyncHandler(async (req, res) => {
    // Validated payload available at req.body
    return ApiResponse.created(res, {
      message: 'Signup validation passed. User registration logic will be active in Phase 5.',
      receivedEmail: req.body.email
    });
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & issue session cookie (Validation active, controller stub for Phase 5)
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    return ApiResponse.success(res, {
      message: 'Login validation passed. Authentication logic will be active in Phase 5.',
      receivedEmail: req.body.email
    });
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Clear authentication cookies
 * @access  Public
 */
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    return ApiResponse.success(res, null, 'Logged out successfully (stub)');
  })
);

module.exports = router;
