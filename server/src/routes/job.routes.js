/**
 * Job Routes (routes/job.routes.js)
 * Endpoints for job querying, personalized recommendations, compatibility matching, and admin CRUD.
 */

const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const matchingController = require('../controllers/jobMatching.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/authorize.middleware');

/**
 * @route   GET /api/jobs/recommended
 * @desc    Get active jobs ranked by compatibility match score for authenticated user
 * @access  Protected
 */
router.get('/recommended', requireAuth, matchingController.getRecommendations);

/**
 * @route   GET /api/jobs
 * @desc    Search and filter active job listings with pagination
 * @access  Public / Authenticated
 */
router.get('/', jobController.listJobs);

/**
 * @route   GET /api/jobs/:id/match
 * @desc    Get 6-dimension compatibility score and skill gap breakdown for a job
 * @access  Protected
 */
router.get('/:id/match', requireAuth, matchingController.getJobMatchResult);

/**
 * @route   GET /api/jobs/:id/match-explanation
 * @desc    Get deep AI semantic match explanation and interview advice
 * @access  Protected
 */
router.get('/:id/match-explanation', requireAuth, matchingController.getJobMatchExplanationResult);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get complete details for a single job listing
 * @access  Public / Authenticated
 */
router.get('/:id', jobController.getJobById);

/**
 * @route   POST /api/jobs
 * @desc    Create a new job listing
 * @access  Protected (Admin only)
 */
router.post('/', requireAuth, requireRole('admin'), jobController.createJob);

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update an existing job listing
 * @access  Protected (Admin only)
 */
router.put('/:id', requireAuth, requireRole('admin'), jobController.updateJob);

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a job listing
 * @access  Protected (Admin only)
 */
router.delete('/:id', requireAuth, requireRole('admin'), jobController.deleteJob);

module.exports = router;
