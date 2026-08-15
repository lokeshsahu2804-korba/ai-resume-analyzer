/**
 * Job Controller (controllers/job.controller.js)
 * HTTP handlers for public job search/details and administrative job CRUD operations.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const {
  createJobSchema,
  updateJobSchema,
  listJobsQuerySchema
} = require('../validators/job.validator');
const {
  listJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob
} = require('../services/job.service');

/**
 * GET /api/jobs
 * Lists active job listings with optional text search, multi-filters, and pagination.
 */
const listJobsHandler = asyncHandler(async (req, res) => {
  const { error, value } = listJobsQuerySchema.validate(req.query, {
    stripUnknown: true
  });

  if (error) {
    throw ApiError.badRequest(error.details[0].message);
  }

  const result = await listJobs(value);
  return ApiResponse.success(res, result, 'Job listings retrieved successfully', 200);
});

/**
 * GET /api/jobs/:id
 * Retrieves full details for a single job listing.
 */
const getJobByIdHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = await getJobById(id);
  return ApiResponse.success(res, { job }, 'Job details retrieved successfully', 200);
});

/**
 * POST /api/jobs
 * Creates a new job posting (Admin only).
 */
const createJobHandler = asyncHandler(async (req, res) => {
  const { error, value } = createJobSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw ApiError.badRequest(error.details.map((d) => d.message).join(', '));
  }

  const job = await createJob(value);
  return ApiResponse.success(res, { job }, 'Job listing created successfully', 201);
});

/**
 * PUT /api/jobs/:id
 * Updates an existing job posting (Admin only).
 */
const updateJobHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error, value } = updateJobSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw ApiError.badRequest(error.details.map((d) => d.message).join(', '));
  }

  const job = await updateJob(id, value);
  return ApiResponse.success(res, { job }, 'Job listing updated successfully', 200);
});

/**
 * DELETE /api/jobs/:id
 * Deletes a job posting (Admin only).
 */
const deleteJobHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await deleteJob(id);
  return ApiResponse.success(res, null, result.message || 'Job listing deleted successfully', 200);
});

module.exports = {
  listJobs: listJobsHandler,
  getJobById: getJobByIdHandler,
  createJob: createJobHandler,
  updateJob: updateJobHandler,
  deleteJob: deleteJobHandler
};
