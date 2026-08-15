/**
 * Analysis Controller (controllers/analysis.controller.js)
 * Handles HTTP requests for triggering AI resume analysis and viewing historical ATS reports.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const {
  analyzeResume,
  getAnalysisById,
  getUserAnalyses,
  getLatestAnalysisForResume
} = require('../services/analysis.service');

/**
 * POST /api/analyses/resume/:resumeId
 * Executes AI ATS analysis on a resume with optional job description matching.
 */
const triggerAnalysis = asyncHandler(async (req, res) => {
  const { resumeId } = req.params;
  const { jobDescription } = req.body || {};

  const analysis = await analyzeResume({
    userId: req.user._id,
    resumeId,
    jobDescription
  });

  return ApiResponse.success(
    res,
    { analysis },
    'Resume analysis completed successfully',
    201
  );
});

/**
 * GET /api/analyses/:id
 * Retrieves detailed analysis report by ID.
 */
const getAnalysis = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const analysis = await getAnalysisById(id, req.user._id);

  return ApiResponse.success(
    res,
    { analysis },
    'Analysis report retrieved successfully',
    200
  );
});

/**
 * GET /api/analyses
 * Lists user's analysis history with pagination.
 */
const listAnalyses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  const result = await getUserAnalyses(req.user._id, page, limit);

  return ApiResponse.success(
    res,
    result,
    'Analysis history retrieved successfully',
    200
  );
});

/**
 * GET /api/analyses/resume/:resumeId/latest
 * Retrieves latest analysis report for a specific resume.
 */
const getLatestForResume = asyncHandler(async (req, res) => {
  const { resumeId } = req.params;
  const analysis = await getLatestAnalysisForResume(resumeId, req.user._id);

  return ApiResponse.success(
    res,
    { analysis },
    'Latest resume analysis retrieved successfully',
    200
  );
});

module.exports = {
  triggerAnalysis,
  getAnalysis,
  listAnalyses,
  getLatestForResume
};
