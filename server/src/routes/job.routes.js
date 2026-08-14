/**
 * Job Recommendation & Search Routes (job.routes.js)
 * Endpoints for job querying and semantic matching (Implemented in Phase 10 & 11).
 */

const express = require('express');
const router = express.Router();
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    return ApiResponse.success(res, {
      jobs: [],
      message: 'Job recommendations endpoint stub (Active in Phase 10)'
    });
  })
);

module.exports = router;
