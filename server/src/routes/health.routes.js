/**
 * Health Check Routes (health.routes.js)
 * Diagnostic and uptime verification endpoints reporting server and database health.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// Map mongoose connection readyStates to readable strings
const readyStateMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

/**
 * @route   GET /api/health
 * @desc    Returns server health, uptime, environment, and database connectivity diagnostics
 * @access  Public
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = readyStateMap[dbState] || 'unknown';

    const healthData = {
      status: 'ok',
      service: 'ai-resume-analyzer-server',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        readyState: dbState,
        host: mongoose.connection.host || null,
        name: mongoose.connection.name || null
      },
      timestamp: new Date().toISOString()
    };

    return ApiResponse.success(res, healthData, 'Server is running and healthy');
  })
);

module.exports = router;
