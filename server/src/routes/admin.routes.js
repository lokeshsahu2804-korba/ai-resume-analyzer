/**
 * Admin Management Routes (admin.routes.js)
 * Endpoints for platform statistics, user roles, and job management.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/authorize.middleware');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/admin/stats
 * @desc    Get administrative platform metrics
 * @access  Protected (Admin only)
 */
router.get(
  '/stats',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    return ApiResponse.success(
      res,
      {
        stats: {
          totalUsers: 1,
          resumesAnalyzed: 0,
          activeJobs: 3
        }
      },
      'Admin statistics retrieved successfully'
    );
  })
);

module.exports = router;
