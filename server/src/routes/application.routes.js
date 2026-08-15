/**
 * Application Routes (routes/application.routes.js)
 * Endpoints for tracking job applications, pipeline stages, and statistics.
 */

const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/application.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createApplicationSchema,
  updateApplicationSchema,
  listApplicationsQuerySchema
} = require('../validators/application.validator');

// All application routes require authentication
router.use(requireAuth);

/**
 * @route   GET /api/applications/stats
 * @desc    Get aggregate application counts by stage
 * @access  Protected
 */
router.get('/stats', applicationController.getStats);

/**
 * @route   GET /api/applications/job/:jobId
 * @desc    Check candidate's application record for a specific job
 * @access  Protected
 */
router.get('/job/:jobId', applicationController.getApplicationByJob);

/**
 * @route   GET /api/applications
 * @desc    List candidate applications with stage filtering & pagination
 * @access  Protected
 */
router.get('/', validate(listApplicationsQuerySchema, 'query'), applicationController.getApplications);

/**
 * @route   POST /api/applications
 * @desc    Submit a new job application
 * @access  Protected
 */
router.post('/', validate(createApplicationSchema), applicationController.createApplication);

/**
 * @route   GET /api/applications/:id
 * @desc    Get complete application details
 * @access  Protected
 */
router.get('/:id', applicationController.getApplicationById);

/**
 * @route   PUT /api/applications/:id
 * @desc    Update application status, notes, or interview schedule
 * @access  Protected
 */
router.put('/:id', validate(updateApplicationSchema), applicationController.updateApplication);

/**
 * @route   DELETE /api/applications/:id
 * @desc    Delete/withdraw an application
 * @access  Protected
 */
router.delete('/:id', applicationController.deleteApplication);

module.exports = router;
