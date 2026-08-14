/**
 * User Profile & Account Routes (user.routes.js)
 * Endpoints for managing user profiles and preferences.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Protected
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    return ApiResponse.success(res, { user: req.user }, 'User profile retrieved successfully');
  })
);

module.exports = router;
