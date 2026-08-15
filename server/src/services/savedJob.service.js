/**
 * Saved Job Service Layer (services/savedJob.service.js)
 * Manages bookmarking, removal, and retrieval of saved job listings.
 */

const mongoose = require('mongoose');
const SavedJob = require('../models/SavedJob');
const Job = require('../models/Job');
const ApiError = require('../utils/ApiError');
const { getUserActiveResume, computeDeterministicJobMatch } = require('./jobMatching.service');

/**
 * Saves/bookmarks a job for the candidate.
 *
 * @param {string} userId
 * @param {string} jobId
 * @param {string} [notes='']
 * @returns {Promise<Document>}
 */
const saveJob = async (userId, jobId, notes = '') => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw ApiError.badRequest('Invalid job identifier format');
  }

  const job = await Job.findById(jobId).lean();
  if (!job || !job.isActive) {
    throw ApiError.notFound('Job listing not found or inactive');
  }

  // Idempotent upsert
  const savedJob = await SavedJob.findOneAndUpdate(
    { userId, jobId },
    {
      $set: {
        notes: notes || '',
        savedAt: new Date()
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return savedJob;
};

/**
 * Removes a saved job bookmark.
 *
 * @param {string} userId
 * @param {string} jobId
 * @returns {Promise<Document>}
 */
const unsaveJob = async (userId, jobId) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw ApiError.badRequest('Invalid job identifier format');
  }

  const deleted = await SavedJob.findOneAndDelete({ userId, jobId });
  if (!deleted) {
    throw ApiError.notFound('Saved job bookmark not found');
  }

  return deleted;
};

/**
 * Retrieves paginated list of bookmarked jobs for the candidate.
 *
 * @param {string} userId
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @returns {Promise<{ savedJobs: Array, total: number, page: number, pages: number }>}
 */
const getSavedJobs = async (userId, page = 1, limit = 10) => {
  const skip = (Number(page) - 1) * Number(limit);

  const [savedRecords, total] = await Promise.all([
    SavedJob.find({ userId })
      .populate('jobId')
      .sort({ savedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    SavedJob.countDocuments({ userId })
  ]);

  // Attempt to enrich with active resume match score
  let activeResume = null;
  let atsScore = 75;
  try {
    const resumeRes = await getUserActiveResume(userId);
    activeResume = resumeRes.resume;
    atsScore = resumeRes.atsScore;
  } catch (err) {
    // Non-critical fallback
  }

  const formattedSavedJobs = savedRecords
    .filter((r) => r.jobId) // Filter out deleted jobs
    .map((record) => {
      const job = record.jobId;
      let matchScore = null;
      let category = 'Unrated';

      if (activeResume?.parsed) {
        const match = computeDeterministicJobMatch(job, activeResume.parsed, atsScore);
        matchScore = match.matchScore;
        category = match.category;
      }

      return {
        _id: record._id,
        savedAt: record.savedAt,
        notes: record.notes,
        matchScore,
        category,
        job: {
          _id: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          experienceLevel: job.experienceLevel,
          salary: job.salary,
          requirements: job.requirements,
          isActive: job.isActive,
          postedAt: job.postedAt
        }
      };
    });

  return {
    savedJobs: formattedSavedJobs,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)) || 1
  };
};

/**
 * Checks if a job is currently saved by user.
 *
 * @param {string} userId
 * @param {string} jobId
 * @returns {Promise<boolean>}
 */
const isJobSavedByUser = async (userId, jobId) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) return false;
  const count = await SavedJob.countDocuments({ userId, jobId });
  return count > 0;
};

module.exports = {
  saveJob,
  unsaveJob,
  getSavedJobs,
  isJobSavedByUser
};
