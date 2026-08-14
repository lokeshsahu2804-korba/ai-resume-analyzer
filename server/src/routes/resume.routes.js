/**
 * Resume Upload & Processing Routes (resume.routes.js)
 * Endpoints for resume upload, retrieval, and management.
 */

const express = require('express');
const router = express.Router();

const resumeController = require('../controllers/resume.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { uploadResumeMiddleware } = require('../middleware/upload.middleware');

/**
 * @route   POST /api/resumes/upload
 * @desc    Upload a new resume PDF
 * @access  Protected
 */
router.post('/upload', requireAuth, uploadResumeMiddleware, resumeController.uploadResume);

/**
 * @route   GET /api/resumes
 * @desc    List user's uploaded resumes
 * @access  Protected
 */
router.get('/', requireAuth, resumeController.listResumes);

/**
 * @route   GET /api/resumes/:id
 * @desc    Get specific resume details
 * @access  Protected
 */
router.get('/:id', requireAuth, resumeController.getResumeById);

/**
 * @route   DELETE /api/resumes/:id
 * @desc    Delete resume and clean up storage
 * @access  Protected
 */
router.delete('/:id', requireAuth, resumeController.deleteResume);

module.exports = router;
