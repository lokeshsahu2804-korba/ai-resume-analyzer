/**
 * Resume Routes (routes/resume.routes.js)
 * Endpoints for PDF upload, FastAPI text extraction, and resume lifecycle management.
 */

const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resume.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { uploadResumeMiddleware } = require('../middleware/upload.middleware');

/**
 * @route   POST /api/resumes/upload
 * @desc    Upload a PDF resume with dual-mode storage & trigger text extraction
 * @access  Protected
 */
router.post('/upload', requireAuth, uploadResumeMiddleware, resumeController.uploadResume);

/**
 * @route   POST /api/resumes/:id/process
 * @desc    Trigger or re-run FastAPI text extraction and structured parsing
 * @access  Protected
 */
router.post('/:id/process', requireAuth, resumeController.processResume);

/**
 * @route   GET /api/resumes
 * @desc    List authenticated user's resumes
 * @access  Protected
 */
router.get('/', requireAuth, resumeController.listResumes);

/**
 * @route   GET /api/resumes/:id
 * @desc    Get details and parsed data of a specific resume
 * @access  Protected
 */
router.get('/:id', requireAuth, resumeController.getResume);

/**
 * @route   DELETE /api/resumes/:id
 * @desc    Delete a resume and remove stored file
 * @access  Protected
 */
router.delete('/:id', requireAuth, resumeController.deleteResume);

module.exports = router;
