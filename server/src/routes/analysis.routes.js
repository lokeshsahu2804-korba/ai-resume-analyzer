/**
 * Analysis Routes (routes/analysis.routes.js)
 * Endpoints for running AI resume analyses and viewing historical ATS reports.
 */

const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysis.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * @route   POST /api/analyses/resume/:resumeId
 * @desc    Run Gemini AI ATS analysis on a candidate's resume
 * @access  Protected
 */
router.post('/resume/:resumeId', requireAuth, analysisController.triggerAnalysis);

/**
 * @route   GET /api/analyses
 * @desc    List authenticated user's analysis history
 * @access  Protected
 */
router.get('/', requireAuth, analysisController.listAnalyses);

/**
 * @route   GET /api/analyses/resume/:resumeId/latest
 * @desc    Get latest analysis report for a specific resume
 * @access  Protected
 */
router.get('/resume/:resumeId/latest', requireAuth, analysisController.getLatestForResume);

/**
 * @route   GET /api/analyses/:id
 * @desc    Get detailed analysis report by ID
 * @access  Protected
 */
router.get('/:id', requireAuth, analysisController.getAnalysis);

module.exports = router;
