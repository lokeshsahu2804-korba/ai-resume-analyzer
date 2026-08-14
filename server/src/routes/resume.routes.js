/**
 * Resume Upload & Processing Routes (resume.routes.js)
 * Endpoints for resume upload, extraction, and history (Implemented in Phase 7 & 8).
 */

const express = require('express');
const router = express.Router();
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    return ApiResponse.success(res, {
      resumes: [],
      message: 'Resume listing endpoint stub (Active in Phase 7)'
    });
  })
);

module.exports = router;
