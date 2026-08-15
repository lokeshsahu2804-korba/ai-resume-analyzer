/**
 * Application Service Layer (services/application.service.js)
 * Manages candidate job application lifecycle, stage transitions, timeline history, and match score snapshots.
 */

const mongoose = require('mongoose');
const Application = require('../models/Application');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { getUserActiveResume, computeDeterministicJobMatch } = require('./jobMatching.service');

const VALID_TRANSITIONS = {
  applied: ['interviewing', 'offered', 'rejected', 'withdrawn'],
  interviewing: ['offered', 'rejected', 'withdrawn'],
  offered: ['rejected', 'withdrawn'],
  rejected: [],
  withdrawn: []
};

/**
 * Creates or resets a candidate job application with an immutable match score snapshot.
 *
 * @param {Object} params - { userId, jobId, resumeId, notes, interviewDate }
 * @returns {Promise<Document>}
 */
const createApplication = async ({ userId, jobId, resumeId, notes = '', interviewDate = null }) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw ApiError.badRequest('Invalid job identifier format');
  }

  const job = await Job.findById(jobId).lean();
  if (!job || !job.isActive) {
    throw ApiError.notFound('Job listing not found or inactive');
  }

  // Verify and load targeted or active resume
  let resume = null;
  let atsScore = 75;

  if (resumeId) {
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      throw ApiError.badRequest('Invalid resume identifier format');
    }
    resume = await Resume.findOne({ _id: resumeId, userId }).lean();
    if (!resume) {
      throw ApiError.notFound('Target resume document not found or access denied');
    }
  } else {
    const activeRes = await getUserActiveResume(userId);
    resume = activeRes.resume;
    atsScore = activeRes.atsScore;
  }

  if (!resume) {
    throw ApiError.badRequest('An uploaded resume is required to submit a job application.');
  }

  // Compute immutable match score snapshot for this application
  let matchScoreSnapshot = 75.0;
  if (resume.parsed) {
    const matchResult = computeDeterministicJobMatch(job, resume.parsed, atsScore);
    matchScoreSnapshot = matchResult.matchScore;
  }

  // Check for existing application record
  const existingApp = await Application.findOne({ userId, jobId });

  if (existingApp) {
    // If application is active, block duplicate
    if (['applied', 'interviewing', 'offered'].includes(existingApp.status)) {
      throw ApiError.conflict(
        `You have already submitted an active application for ${job.title} at ${job.company} (Current status: ${existingApp.status}).`
      );
    }

    // If terminal (withdrawn/rejected), allow re-application by resetting state
    existingApp.status = 'applied';
    existingApp.resumeId = resume._id;
    existingApp.matchScore = matchScoreSnapshot;
    existingApp.notes = notes || '';
    existingApp.interviewDate = interviewDate || null;
    existingApp.appliedAt = new Date();
    existingApp.statusHistory.push({
      status: 'applied',
      changedAt: new Date(),
      note: notes ? `Reapplied: ${notes}` : 'Reapplication submitted'
    });

    await existingApp.save();
    logger.info(`Reapplication submitted for user ${userId} on job ${jobId} (score: ${matchScoreSnapshot}%)`);
    return existingApp;
  }

  // Create new Application record
  const newApp = await Application.create({
    userId,
    jobId,
    resumeId: resume._id,
    status: 'applied',
    matchScore: matchScoreSnapshot,
    notes: notes || '',
    interviewDate: interviewDate || null,
    appliedAt: new Date(),
    statusHistory: [
      {
        status: 'applied',
        changedAt: new Date(),
        note: notes ? `Applied: ${notes}` : 'Initial application submitted'
      }
    ]
  });

  logger.info(`New application ${newApp._id} created for user ${userId} on job ${jobId} (score: ${matchScoreSnapshot}%)`);
  return newApp;
};

/**
 * Retrieves paginated applications for candidate with optional stage filtering.
 *
 * @param {Object} params - { userId, status, page, limit }
 * @returns {Promise<{ applications: Array, total: number, page: number, pages: number }>}
 */
const getApplications = async ({ userId, status, page = 1, limit = 10 }) => {
  const query = { userId };
  if (status) {
    query.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate('jobId', 'title company location type salary requirements experienceLevel isActive postedAt')
      .populate('resumeId', 'file.originalName file.fileUrl status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Application.countDocuments(query)
  ]);

  return {
    applications,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)) || 1
  };
};

/**
 * Retrieves a single application by ID for the authenticated user.
 *
 * @param {string} applicationId
 * @param {string} userId
 * @returns {Promise<Document>}
 */
const getApplicationById = async (applicationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw ApiError.badRequest('Invalid application identifier format');
  }

  const application = await Application.findOne({ _id: applicationId, userId })
    .populate('jobId')
    .populate('resumeId', 'file.originalName file.fileUrl status')
    .lean();

  if (!application) {
    throw ApiError.notFound('Application record not found');
  }

  return application;
};

/**
 * Updates application status, notes, or interview schedule.
 *
 * @param {string} applicationId
 * @param {string} userId
 * @param {Object} updates - { status, notes, interviewDate }
 * @returns {Promise<Document>}
 */
const updateApplication = async (applicationId, userId, { status, notes, interviewDate }) => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw ApiError.badRequest('Invalid application identifier format');
  }

  const application = await Application.findOne({ _id: applicationId, userId });
  if (!application) {
    throw ApiError.notFound('Application record not found');
  }

  // Validate status transition
  if (status && status !== application.status) {
    const allowed = VALID_TRANSITIONS[application.status] || [];
    if (!allowed.includes(status)) {
      throw ApiError.badRequest(
        `Invalid status transition from '${application.status}' to '${status}'. Allowed transitions: ${allowed.join(', ') || 'None (terminal state)'}`
      );
    }

    application.status = status;
    application.statusHistory.push({
      status,
      changedAt: new Date(),
      note: notes || `Stage updated to ${status}`
    });
  }

  if (notes !== undefined) {
    application.notes = notes;
  }

  if (interviewDate !== undefined) {
    application.interviewDate = interviewDate ? new Date(interviewDate) : null;
  }

  await application.save();
  logger.info(`Application ${applicationId} updated: status=${application.status}`);

  return application;
};

/**
 * Deletes or withdraws an application record.
 *
 * @param {string} applicationId
 * @param {string} userId
 * @returns {Promise<Document>}
 */
const deleteApplication = async (applicationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw ApiError.badRequest('Invalid application identifier format');
  }

  const deleted = await Application.findOneAndDelete({ _id: applicationId, userId });
  if (!deleted) {
    throw ApiError.notFound('Application record not found');
  }

  logger.info(`Application ${applicationId} deleted for user ${userId}`);
  return deleted;
};

/**
 * Retrieves aggregate application statistics for dashboard metrics.
 *
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const getApplicationStats = async (userId) => {
  const [total, applied, interviewing, offered, rejected, withdrawn] = await Promise.all([
    Application.countDocuments({ userId }),
    Application.countDocuments({ userId, status: 'applied' }),
    Application.countDocuments({ userId, status: 'interviewing' }),
    Application.countDocuments({ userId, status: 'offered' }),
    Application.countDocuments({ userId, status: 'rejected' }),
    Application.countDocuments({ userId, status: 'withdrawn' })
  ]);

  return {
    total,
    active: applied + interviewing + offered,
    applied,
    interviewing,
    offered,
    rejected,
    withdrawn
  };
};

/**
 * Checks if candidate has an application for a job.
 *
 * @param {string} userId
 * @param {string} jobId
 * @returns {Promise<Object|null>}
 */
const getApplicationForJob = async (userId, jobId) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) return null;
  return Application.findOne({ userId, jobId }).lean();
};

module.exports = {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  getApplicationStats,
  getApplicationForJob
};
