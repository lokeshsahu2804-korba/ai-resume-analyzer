/**
 * Health Check Routes (health.routes.js)
 * Diagnostic and uptime verification endpoints.
 */

const express = require('express');
const router = express.Router();
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/health
 * @desc    Returns server health, uptime, and environment diagnostics
 * @access  Public
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const healthData = {
      status: 'ok',
      service: 'ai-resume-analyzer-server',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    };

    return ApiResponse.success(res, healthData, 'Server is running and healthy');
  })
);

module.exports = router;
