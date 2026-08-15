/**
 * Job Matching Controller (controllers/jobMatching.controller.js)
 * HTTP handlers for personalized job recommendations, compatibility match calculations, and AI explanations.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const {
  getRecommendedJobs,
  getJobMatch,
  getJobMatchExplanation
} = require('../services/jobMatching.service');

/**
 * GET /api/jobs/recommended
 * Retrieves active job recommendations ranked by match score for the authenticated user's active resume.
 */
const getRecommendations = asyncHandler(async (req, res) => {
  const { resumeId, minMatch, page = 1, limit = 10 } = req.query;

  const result = await getRecommendedJobs({
    userId: req.user._id,
    resumeId,
    minMatch,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10
  });

  return ApiResponse.success(res, result, 'Job recommendations retrieved successfully', 200);
});

/**
 * GET /api/jobs/:id/match
 * Calculates 6-dimension deterministic compatibility score and skill gap breakdown for a specific job.
 */
const getJobMatchResult = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { resumeId } = req.query;

  const result = await getJobMatch({
    jobId: id,
    userId: req.user._id,
    resumeId
  });

  return ApiResponse.success(res, result, 'Job compatibility match computed successfully', 200);
});

/**
 * GET /api/jobs/:id/match-explanation
 * Generates deep AI semantic compatibility explanation, strengths, gaps, and interview advice.
 */
const getJobMatchExplanationResult = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { resumeId } = req.query;

  const result = await getJobMatchExplanation({
    jobId: id,
    userId: req.user._id,
    resumeId,
    user: req.user
  });

  return ApiResponse.success(res, result, 'Job match explanation generated successfully', 200);
});

module.exports = {
  getRecommendations,
  getJobMatchResult,
  getJobMatchExplanationResult
};
