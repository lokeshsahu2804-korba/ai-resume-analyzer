/**
 * Application Controller (controllers/application.controller.js)
 * HTTP handlers for job application lifecycle, stage tracking, updates, and metrics.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const applicationService = require('../services/application.service');

/**
 * POST /api/applications
 * Submits a new job application with an immutable match score snapshot.
 */
const createApplication = asyncHandler(async (req, res) => {
  const { jobId, resumeId, notes, interviewDate } = req.body;

  const application = await applicationService.createApplication({
    userId: req.user._id,
    jobId,
    resumeId,
    notes,
    interviewDate
  });

  return ApiResponse.created(res, { application }, 'Job application submitted successfully');
});

/**
 * GET /api/applications
 * Retrieves candidate's applications with optional status filtering and pagination.
 */
const getApplications = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const result = await applicationService.getApplications({
    userId: req.user._id,
    status,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10
  });

  return ApiResponse.success(res, result, 'Applications retrieved successfully', 200);
});

/**
 * GET /api/applications/stats
 * Retrieves pipeline summary counts for dashboard and analytics widgets.
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await applicationService.getApplicationStats(req.user._id);
  return ApiResponse.success(res, { stats }, 'Application pipeline stats retrieved', 200);
});

/**
 * GET /api/applications/job/:jobId
 * Retrieves existing application record for a specific job if candidate has applied.
 */
const getApplicationByJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const application = await applicationService.getApplicationForJob(req.user._id, jobId);
  return ApiResponse.success(res, { application, hasApplied: Boolean(application) }, 'Job application status retrieved', 200);
});

/**
 * GET /api/applications/:id
 * Retrieves a single application record by ID.
 */
const getApplicationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const application = await applicationService.getApplicationById(id, req.user._id);
  return ApiResponse.success(res, { application }, 'Application details retrieved successfully', 200);
});

/**
 * PUT /api/applications/:id
 * Updates application status, notes, or interview schedule.
 */
const updateApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes, interviewDate } = req.body;

  const application = await applicationService.updateApplication(id, req.user._id, {
    status,
    notes,
    interviewDate
  });

  return ApiResponse.success(res, { application }, 'Application updated successfully', 200);
});

/**
 * DELETE /api/applications/:id
 * Withdraws/deletes an application record.
 */
const deleteApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await applicationService.deleteApplication(id, req.user._id);
  return ApiResponse.success(res, null, 'Application removed successfully', 200);
});

module.exports = {
  createApplication,
  getApplications,
  getStats,
  getApplicationByJob,
  getApplicationById,
  updateApplication,
  deleteApplication
};
