/**
 * Saved Job Controller (controllers/savedJob.controller.js)
 * HTTP handlers for saving/bookmarking jobs, unsaving, and listing bookmarked jobs.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const savedJobService = require('../services/savedJob.service');

/**
 * POST /api/jobs/:id/save
 * Saves a job to user's bookmarks.
 */
const saveJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const savedJob = await savedJobService.saveJob(req.user._id, id, notes);
  return ApiResponse.success(res, { savedJob }, 'Job bookmarked successfully', 200);
});

/**
 * DELETE /api/jobs/:id/save
 * Removes a job from user's bookmarks.
 */
const unsaveJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await savedJobService.unsaveJob(req.user._id, id);
  return ApiResponse.success(res, null, 'Job removed from bookmarks', 200);
});

/**
 * GET /api/jobs/saved
 * Retrieves candidate's saved job bookmarks with pagination.
 */
const getSavedJobs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const result = await savedJobService.getSavedJobs(
    req.user._id,
    parseInt(page, 10) || 1,
    parseInt(limit, 10) || 10
  );

  return ApiResponse.success(res, result, 'Saved job bookmarks retrieved successfully', 200);
});

/**
 * GET /api/jobs/:id/saved-status
 * Checks if a specific job is bookmarked by user.
 */
const checkSavedStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isSaved = await savedJobService.isJobSavedByUser(req.user._id, id);

  return ApiResponse.success(res, { isSaved }, 'Job saved status retrieved', 200);
});

module.exports = {
  saveJob,
  unsaveJob,
  getSavedJobs,
  checkSavedStatus
};
