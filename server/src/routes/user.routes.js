/**
 * User Profile & Account Routes (user.routes.js)
 * Endpoints for managing user profiles and preferences (Implemented in Phase 6).
 */

const express = require('express');
const router = express.Router();
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    return ApiResponse.success(res, {
      message: 'User profile endpoint stub (Active in Phase 6)'
    });
  })
);

module.exports = router;
