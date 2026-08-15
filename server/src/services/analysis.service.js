/**
 * Analysis Service (services/analysis.service.js)
 * Manages AI ATS analysis orchestration, user quota enforcement, and result persistence.
 */

const User = require('../models/User');
const Resume = require('../models/Resume');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { analyzeResumeWithFastAPI } = require('./fastapi.service');
const { processResumeById } = require('./resume.service');

/**
 * Executes full AI resume analysis and ATS scoring for a candidate's resume.
 * Enforces strict pre-quota checks and atomically increments quota only upon successful persistence.
 *
 * @param {Object} params - { userId, resumeId, jobDescription }
 * @returns {Promise<Document>} The created ResumeAnalysis document
 */
const analyzeResume = async ({ userId, resumeId, jobDescription }) => {
  // 1. Fetch User & Validate Quota
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User account not found');
  }

  const isPremium = user.isPremium || user.subscription?.status === 'active';
  const used = user.usageLimits?.resumeAnalysesUsed || 0;
  const limit = user.usageLimits?.resumeAnalysesLimit || 3;

  if (!isPremium && used >= limit) {
    throw ApiError.forbidden(
      `Monthly resume analysis limit reached (${used}/${limit}). Upgrade to Premium for unlimited analyses.`
    );
  }

  // 2. Fetch Resume & Verify Ownership
  let resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) {
    throw ApiError.notFound('Resume document not found or access denied');
  }

  // Guard against concurrent duplicate analyses
  if (resume.status === 'processing') {
    throw ApiError.conflict('Resume analysis is already in progress for this document. Please wait.');
  }

  // Ensure text extraction is completed; extract if not yet parsed
  if (!resume.extractedText || resume.status === 'uploaded') {
    logger.info(`Resume ${resumeId} not yet parsed. Running extraction prior to AI analysis.`);
    resume = await processResumeById(resumeId, userId);
  }

  // Update status to processing
  resume.status = 'processing';
  await resume.save();

  try {
    // 3. Invoke FastAPI AI Service
    const aiResult = await analyzeResumeWithFastAPI({
      resumeId: resume._id,
      extractedText: resume.extractedText,
      parsed: resume.parsed,
      jobDescription: jobDescription || '',
      isPremium
    });

    if (!aiResult || !aiResult.atsScore) {
      throw ApiError.badRequest('AI analysis service returned invalid scoring data');
    }

    // 4. Persist ResumeAnalysis Record in MongoDB Atlas
    const analysis = await ResumeAnalysis.create({
      userId,
      resumeId: resume._id,
      atsScore: aiResult.atsScore,
      strengths: aiResult.strengths || [],
      weaknesses: aiResult.weaknesses || [],
      suggestions: aiResult.suggestions || [],
      skillsAnalysis: aiResult.skillsAnalysis || {},
      aiInsights: aiResult.aiInsights || '',
      isPremium,
      processingTimeMs: aiResult.processingTimeMs || 0
    });

    // 5. Update Resume Status to Analyzed
    resume.status = 'analyzed';
    await resume.save();

    // 6. Atomically Increment User Quota on Success Only
    user.usageLimits.resumeAnalysesUsed = used + 1;
    await user.save();

    logger.info(
      `Analysis ${analysis._id} completed for user ${userId}. Score: ${analysis.atsScore.overall}. Quota used: ${user.usageLimits.resumeAnalysesUsed}/${limit}`
    );

    return analysis;
  } catch (err) {
    logger.error(`AI analysis failed for resume ${resumeId}: ${err.message}`);
    // Revert status to parsed so user can retry
    resume.status = 'parsed';
    await resume.save().catch(() => {});
    throw err;
  }
};

/**
 * Retrieves a single analysis report by ID.
 *
 * @param {string} analysisId
 * @param {string} userId
 * @returns {Promise<Document>}
 */
const getAnalysisById = async (analysisId, userId) => {
  const analysis = await ResumeAnalysis.findOne({ _id: analysisId, userId })
    .populate('resumeId', 'file.originalName file.fileUrl status createdAt')
    .lean();

  if (!analysis) {
    throw ApiError.notFound('Resume analysis report not found');
  }

  return analysis;
};

/**
 * Retrieves paginated list of analysis history for authenticated user.
 *
 * @param {string} userId
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @returns {Promise<{ analyses: Array, total: number, page: number, pages: number }>}
 */
const getUserAnalyses = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [analyses, total] = await Promise.all([
    ResumeAnalysis.find({ userId })
      .populate('resumeId', 'file.originalName file.fileUrl status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ResumeAnalysis.countDocuments({ userId })
  ]);

  return {
    analyses,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit)
  };
};

/**
 * Retrieves latest analysis report for a specific resume.
 *
 * @param {string} resumeId
 * @param {string} userId
 * @returns {Promise<Document>}
 */
const getLatestAnalysisForResume = async (resumeId, userId) => {
  const analysis = await ResumeAnalysis.findOne({ resumeId, userId })
    .populate('resumeId', 'file.originalName file.fileUrl status')
    .sort({ createdAt: -1 })
    .lean();

  if (!analysis) {
    throw ApiError.notFound('No analysis found for this resume');
  }

  return analysis;
};

module.exports = {
  analyzeResume,
  getAnalysisById,
  getUserAnalyses,
  getLatestAnalysisForResume
};
