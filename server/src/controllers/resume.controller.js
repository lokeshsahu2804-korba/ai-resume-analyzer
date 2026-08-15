/**
 * Resume Controller (controllers/resume.controller.js)
 * Handles HTTP endpoints for uploading, parsing, listing, and managing resumes.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { uploadFile } = require('../config/cloudinary');
const {
  createResumeRecord,
  processResumeById,
  triggerBackgroundResumeProcessing,
  getUserResumes,
  getResumeById,
  deleteResumeById
} = require('../services/resume.service');

/**
 * POST /api/resumes/upload
 * Handles multipart PDF resume upload with dual-mode storage and background parsing trigger.
 */
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No resume file provided. Please upload a PDF document.');
  }

  // Save to Cloudinary or fallback to local disk
  const uploadResult = await uploadFile(req.file.buffer, {
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    userId: req.user._id
  });

  // Create MongoDB document
  const resume = await createResumeRecord(req.user._id, {
    ...uploadResult,
    originalName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype
  });

  // Automatically trigger FastAPI background extraction
  triggerBackgroundResumeProcessing(resume._id, req.user._id);

  return ApiResponse.success(
    res,
    { resume },
    'Resume uploaded successfully and queued for text processing',
    201
  );
});

/**
 * POST /api/resumes/:id/process
 * Manually triggers or re-runs FastAPI text extraction and parsing for a resume.
 */
const processResume = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const resume = await processResumeById(id, req.user._id);

  return ApiResponse.success(
    res,
    { resume },
    'Resume processed, extracted, and structured successfully',
    200
  );
});

/**
 * GET /api/resumes
 * Lists resumes for the authenticated user with pagination.
 */
const listResumes = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  const result = await getUserResumes(req.user._id, page, limit);

  return ApiResponse.success(
    res,
    result,
    'Resumes retrieved successfully',
    200
  );
});

/**
 * GET /api/resumes/:id
 * Retrieves details of a specific resume for the authenticated user.
 */
const getResume = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const resume = await getResumeById(id, req.user._id);

  return ApiResponse.success(
    res,
    { resume },
    'Resume details retrieved successfully',
    200
  );
});

/**
 * DELETE /api/resumes/:id
 * Deletes a resume document and cleans up cloud/local storage.
 */
const deleteResume = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const resume = await deleteResumeById(id, req.user._id);

  return ApiResponse.success(
    res,
    { id: resume._id },
    'Resume deleted and storage cleaned up successfully',
    200
  );
});

module.exports = {
  uploadResume,
  processResume,
  listResumes,
  getResume,
  deleteResume
};
