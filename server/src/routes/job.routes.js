/**
 * Job Routes (routes/job.routes.js)
 * Endpoints for public job searching/browsing and administrative job CRUD operations.
 */

const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/authorize.middleware');

/**
 * @route   GET /api/jobs
 * @desc    Search and filter active job listings with pagination
 * @access  Public / Authenticated
 */
router.get('/', jobController.listJobs);

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
