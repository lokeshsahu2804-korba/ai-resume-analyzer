/**
 * Job Matching Service Layer (services/jobMatching.service.js)
 * Implements mathematical 6-dimension compatibility matching, skill-gap analysis, and AI recommendations.
 */

const mongoose = require('mongoose');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { matchJobWithFastAPI } = require('./fastapi.service');

const EXPERIENCE_TIER = {
  entry: 1,
  mid: 2,
  senior: 3,
  lead: 4
};

/**
 * Normalizes skill string into lowercase alphanumeric token.
 * @param {string} skill
 * @returns {string}
 */
function normalizeSkill(skill = '') {
  return skill
    .toLowerCase()
    .trim()
    .replace(/[^\w\s+#.]/g, '')
    .replace(/^react\.js$/, 'react')
    .replace(/^nodejs$/, 'node.js')
    .replace(/^golang$/, 'go')
    .replace(/^k8s$/, 'kubernetes');
}

/**
 * Calculates 6-dimension deterministic compatibility score strictly summing to 0-100%.
 *
 * @param {Object} job - Job document
 * @param {Object} parsed - Parsed resume object
 * @param {number} [atsScore=75] - Latest candidate ATS score (0-100)
 * @returns {Object} Full match breakdown and skill gap details
 */
function computeDeterministicJobMatch(job, parsed = {}, atsScore = 75) {
  const candidateSkills = parsed.skills || [];
  const requiredSkills = job.requirements?.skills || [];

  // 1. Core Skills Overlap (Max 40 points)
  const candidateNormMap = new Map();
  candidateSkills.forEach((s) => {
    if (s) candidateNormMap.set(normalizeSkill(s), s);
  });

  const matchingSkills = [];
  const missingSkills = [];

  requiredSkills.forEach((req) => {
    const normReq = normalizeSkill(req);
    let found = false;
    for (const [cNorm, originalC] of candidateNormMap.entries()) {
      if (normReq === cNorm || normReq.includes(cNorm) || cNorm.includes(normReq)) {
        matchingSkills.push(req);
        found = true;
        break;
      }
    }
    if (!found) missingSkills.push(req);
  });

  const reqNormSet = new Set(requiredSkills.map(normalizeSkill));
  const bonusSkills = candidateSkills
    .filter((c) => !reqNormSet.has(normalizeSkill(c)))
    .slice(0, 6);

  const totalReq = Math.max(1, requiredSkills.length);
  const skillsScore = Number(((matchingSkills.length / totalReq) * 40.0).toFixed(1));

  // 2. Experience Level & Tenure Compatibility (Max 20 points)
  const targetTier = EXPERIENCE_TIER[job.experienceLevel] || 2;
  const expEntries = parsed.experience || [];
  const expCorpus = `${parsed.summary || ''} ${expEntries.map((e) => e.title || '').join(' ')}`.toLowerCase();

  let candidateTier = 1;
  if (/lead|principal|staff|architect|head|director/.test(expCorpus)) {
    candidateTier = 4;
  } else if (/senior|sr\.|sr |5\+|6\+|7\+|8\+/.test(expCorpus) || expEntries.length >= 3) {
    candidateTier = 3;
  } else if (expEntries.length >= 1 || /mid|2\+|3\+|4\+/.test(expCorpus)) {
    candidateTier = 2;
  }

  let experienceScore = 6.0;
  if (candidateTier === targetTier) {
    experienceScore = 20.0;
  } else if (candidateTier > targetTier) {
    experienceScore = 18.0; // Overqualified
  } else if (targetTier - candidateTier === 1) {
    experienceScore = 12.0; // 1 tier gap
  } else {
    experienceScore = 6.0; // 2+ tiers gap
  }

  // 3. Job Title & Domain Alignment (Max 15 points)
  const jobTokens = job.title.toLowerCase().match(/\b[a-zA-Z]{3,}\b/g) || [];
  const stopWords = new Set(['and', 'the', 'for', 'with', 'engineer', 'developer', 'senior', 'lead', 'junior']);
  const domainTokens = jobTokens.filter((t) => !stopWords.has(t));

  let titleScore = 12.0;
  if (domainTokens.length > 0) {
    const matchedTokens = domainTokens.filter((t) => expCorpus.includes(t)).length;
    const ratio = matchedTokens / domainTokens.length;
    titleScore = Number((6.0 + ratio * 9.0).toFixed(1));
  }

  // 4. Resume ATS Quality Score (Max 10 points)
  const atsQualityScore = Number(Math.min(10.0, Math.max(2.0, (atsScore / 100.0) * 10.0)).toFixed(1));

  // 5. Education & Credentials (Max 10 points)
  let educationScore = 5.0;
  const eduEntries = parsed.education || [];
  if (eduEntries.length > 0) {
    const eduText = eduEntries.map((e) => `${e.degree || ''} ${e.field || ''}`).join(' ').toLowerCase();
    if (/computer|engineering|b\.tech|m\.tech|b\.s\.|m\.s\.|bachelor|master|phd/.test(eduText)) {
      educationScore = 10.0;
    } else {
      educationScore = 7.5;
    }
  }

  // 6. Location & Work Mode Fit (Max 5 points)
  let locationScore = 3.5;
  const jobLoc = (job.location || '').toLowerCase();
  const candLoc = (parsed.location || '').toLowerCase();
  if (!jobLoc || jobLoc.includes('remote')) {
    locationScore = 5.0;
  } else if (candLoc && jobLoc.includes(candLoc)) {
    locationScore = 5.0;
  }

  const overall = Number(
    Math.min(
      100.0,
      Math.max(
        0.0,
        skillsScore + experienceScore + titleScore + atsQualityScore + educationScore + locationScore
      )
    ).toFixed(1)
  );

  let category = 'Low Match';
  if (overall >= 85.0) category = 'Great Match';
  else if (overall >= 70.0) category = 'Good Match';
  else if (overall >= 50.0) category = 'Potential Match';

  return {
    matchScore: overall,
    category,
    breakdown: {
      skillsScore,
      experienceScore,
      titleScore,
      atsQualityScore,
      educationScore,
      locationScore
    },
    matchingSkills,
    missingSkills,
    bonusSkills
  };
}

/**
 * Retrieves the candidate's active resume and latest ATS analysis.
 *
 * @param {string} userId
 * @param {string} [requestedResumeId]
 * @returns {Promise<{ resume: Document, atsScore: number }>}
 */
async function getUserActiveResume(userId, requestedResumeId) {
  let resume = null;

  if (requestedResumeId) {
    if (!mongoose.Types.ObjectId.isValid(requestedResumeId)) {
      throw ApiError.badRequest('Invalid resume identifier format');
    }
    resume = await Resume.findOne({ _id: requestedResumeId, userId }).lean();
    if (!resume) {
      throw ApiError.notFound('Target resume document not found or access denied');
    }
  } else {
    resume = await Resume.findOne({ userId, isActive: true }).sort({ createdAt: -1 }).lean();
    if (!resume) {
      resume = await Resume.findOne({ userId }).sort({ createdAt: -1 }).lean();
    }
  }

  if (!resume) {
    return { resume: null, atsScore: 75.0 };
  }

  // Retrieve latest ATS score if available
  let atsScore = 75.0;
  const latestAnalysis = await ResumeAnalysis.findOne({ userId, resumeId: resume._id })
    .sort({ createdAt: -1 })
    .lean();

  if (latestAnalysis?.atsScore?.overall) {
    atsScore = latestAnalysis.atsScore.overall;
  }

  return { resume, atsScore };
}

/**
 * Returns personalized job recommendations ranked by compatibility match score.
 *
 * @param {Object} params - { userId, resumeId, minMatch, page, limit }
 * @returns {Promise<{ jobs: Array, total: number, page: number, pages: number, hasResume: boolean }>}
 */
const getRecommendedJobs = async ({ userId, resumeId, minMatch, page = 1, limit = 10 }) => {
  const { resume, atsScore } = await getUserActiveResume(userId, resumeId);

  // If user has not uploaded/parsed a resume yet, return standard active jobs gracefully
  if (!resume || !resume.parsed) {
    const skip = (Number(page) - 1) * Number(limit);
    const [jobs, total] = await Promise.all([
      Job.find({ isActive: true }).sort({ postedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Job.countDocuments({ isActive: true })
    ]);

    return {
      jobs: jobs.map((j) => ({ ...j, matchScore: null, category: 'Unrated', matchingSkills: [], missingSkills: [] })),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      hasResume: false,
      message: 'Upload a resume to unlock personalized compatibility scoring and recommendations.'
    };
  }

  // Retrieve active jobs from catalog
  const allActiveJobs = await Job.find({ isActive: true }).lean();

  // Compute deterministic match score for every active job
  let scoredJobs = allActiveJobs.map((job) => {
    const match = computeDeterministicJobMatch(job, resume.parsed, atsScore);
    return {
      ...job,
      matchScore: match.matchScore,
      category: match.category,
      breakdown: match.breakdown,
      matchingSkills: match.matchingSkills,
      missingSkills: match.missingSkills,
      bonusSkills: match.bonusSkills
    };
  });

  // Optional minMatch filter
  if (minMatch !== undefined && minMatch !== null) {
    scoredJobs = scoredJobs.filter((j) => j.matchScore >= Number(minMatch));
  }

  // Sort descending by match score
  scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

  const total = scoredJobs.length;
  const skip = (Number(page) - 1) * Number(limit);
  const paginatedJobs = scoredJobs.slice(skip, skip + Number(limit));

  return {
    jobs: paginatedJobs,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)) || 1,
    hasResume: true,
    resumeId: resume._id,
    activeResumeName: resume.file?.originalName || 'Resume.pdf'
  };
};

/**
 * Computes deterministic match breakdown for a specific job and candidate resume.
 *
 * @param {Object} params - { jobId, userId, resumeId }
 * @returns {Promise<Object>}
 */
const getJobMatch = async ({ jobId, userId, resumeId }) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw ApiError.badRequest('Invalid job identifier format');
  }

  const job = await Job.findById(jobId).lean();
  if (!job) {
    throw ApiError.notFound('Job listing not found');
  }

  const { resume, atsScore } = await getUserActiveResume(userId, resumeId);
  if (!resume || !resume.parsed) {
    throw ApiError.badRequest('Please upload and parse a resume first to evaluate job compatibility.');
  }

  const match = computeDeterministicJobMatch(job, resume.parsed, atsScore);

  return {
    jobId: job._id,
    jobTitle: job.title,
    company: job.company,
    ...match,
    resumeId: resume._id,
    resumeName: resume.file?.originalName || 'Resume.pdf'
  };
};

/**
 * Retrieves deep AI semantic match explanation and interview advice from FastAPI.
 *
 * @param {Object} params - { jobId, userId, resumeId, user }
 * @returns {Promise<Object>}
 */
const getJobMatchExplanation = async ({ jobId, userId, resumeId, user }) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw ApiError.badRequest('Invalid job identifier format');
  }

  const job = await Job.findById(jobId).lean();
  if (!job) {
    throw ApiError.notFound('Job listing not found');
  }

  const { resume, atsScore } = await getUserActiveResume(userId, resumeId);
  if (!resume || !resume.parsed) {
    throw ApiError.badRequest('Please upload and parse a resume first to evaluate job compatibility.');
  }

  const isPremium = user?.isPremium || user?.plan === 'premium';

  // Request explanation from FastAPI microservice
  const aiExplanation = await matchJobWithFastAPI({
    jobId: job._id.toString(),
    jobTitle: job.title,
    jobCompany: job.company,
    jobDescription: job.description || '',
    requiredSkills: job.requirements?.skills || [],
    experienceLevel: job.experienceLevel || 'mid',
    location: job.location || '',
    candidateSkills: resume.parsed.skills || [],
    candidateExperience: resume.parsed.experience || [],
    candidateEducation: resume.parsed.education || [],
    candidateSummary: resume.parsed.summary || '',
    candidateLocation: resume.parsed.location || '',
    candidateAtsScore: atsScore,
    isPremium
  });

  return {
    jobId: job._id,
    jobTitle: job.title,
    company: job.company,
    ...aiExplanation,
    resumeId: resume._id,
    resumeName: resume.file?.originalName || 'Resume.pdf'
  };
};

module.exports = {
  computeDeterministicJobMatch,
  getRecommendedJobs,
  getJobMatch,
  getJobMatchExplanation
};
