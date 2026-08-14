/**
 * Admin Management Routes (admin.routes.js)
 * Endpoints for platform statistics, user roles, and job management (Implemented in Phase 16).
 */

const express = require('express');
const router = express.Router();
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    return ApiResponse.success(res, {
      stats: { totalUsers: 0, resumesAnalyzed: 0 },
      message: 'Admin stats endpoint stub (Active in Phase 16)'
    });
  })
);

module.exports = router;
