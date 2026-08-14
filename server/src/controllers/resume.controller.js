/**
 * Resume Controller (controllers/resume.controller.js)
 * HTTP request handlers for resume uploads, listing, details retrieval, and deletion.
 */

const resumeService = require('../services/resume.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Upload a new resume PDF
 * @route   POST /api/resumes/upload
 * @access  Protected
 */
const uploadResume = asyncHandler(async (req, res) => {
  const resume = await resumeService.uploadResume(req.user._id, req.file.buffer, req.file);
  return ApiResponse.created(res, { resume }, 'Resume uploaded successfully');
});

/**
 * @desc    List all active resumes for the authenticated user
 * @route   GET /api/resumes
 * @access  Protected
 */
const listResumes = asyncHandler(async (req, res) => {
  const data = await resumeService.listResumes(req.user._id, req.query);
  return ApiResponse.success(res, data, 'Resumes retrieved successfully');
});

/**
 * @desc    Get details of a specific resume
 * @route   GET /api/resumes/:id
 * @access  Protected
 */
const getResumeById = asyncHandler(async (req, res) => {
  const resume = await resumeService.getResumeById(req.user._id, req.params.id);
  return ApiResponse.success(res, { resume }, 'Resume details retrieved');
});

/**
 * @desc    Delete a resume and clean up physical storage
 * @route   DELETE /api/resumes/:id
 * @access  Protected
 */
const deleteResume = asyncHandler(async (req, res) => {
  await resumeService.deleteResume(req.user._id, req.params.id);
  return ApiResponse.success(res, null, 'Resume deleted successfully');
});

module.exports = {
  uploadResume,
  listResumes,
  getResumeById,
  deleteResume
};
