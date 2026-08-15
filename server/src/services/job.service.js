/**
 * Job Service Layer (services/job.service.js)
 * Manages job querying, full-text search, multi-parameter filtering, pagination, and administrative CRUD operations.
 */

const mongoose = require('mongoose');
const Job = require('../models/Job');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Escapes regex special characters to prevent ReDoS / regex injection attacks.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generates lowercase normalized skill tokens for deterministic search indexing.
 * @param {Array<string>} skills
 * @returns {Array<string>}
 */
function normalizeSkills(skills = []) {
  if (!Array.isArray(skills)) return [];
  const set = new Set();
  skills.forEach((s) => {
    if (typeof s === 'string' && s.trim()) {
      set.add(s.trim().toLowerCase());
    }
  });
  return Array.from(set);
}

/**
 * Lists active job postings with comprehensive search, filters, and pagination.
 *
 * @param {Object} query - Validated query parameters
 * @returns {Promise<{ jobs: Array, total: number, page: number, pages: number, limit: number }>}
 */
const listJobs = async (query = {}) => {
  const {
    search,
    experienceLevel,
    type,
    location,
    minSalary,
    maxSalary,
    page = 1,
    limit = 10,
    sort = '-postedAt',
    includeInactive = false
  } = query;

  const filter = {};

  // Active status filter (unless explicitly requested by admin)
  if (!includeInactive) {
    filter.isActive = true;
  }

  // Multi-field search (title, company, description, normalized skills)
  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    const searchRegex = new RegExp(escaped, 'i');

    filter.$or = [
      { title: searchRegex },
      { company: searchRegex },
      { description: searchRegex },
      { skillsNormalized: searchRegex },
      { 'requirements.skills': searchRegex }
    ];
  }

  // Exact match filters
  if (experienceLevel) {
    filter.experienceLevel = experienceLevel;
  }

  if (type) {
    filter.type = type;
  }

  // Partial case-insensitive location filter
  if (location && location.trim()) {
    filter.location = new RegExp(escapeRegex(location.trim()), 'i');
  }

  // Salary range filters
  if (minSalary !== undefined && minSalary !== null) {
    filter['salary.max'] = { $gte: Number(minSalary) };
  }

  if (maxSalary !== undefined && maxSalary !== null) {
    filter['salary.min'] = { $lte: Number(maxSalary) };
  }

  // Sorting definition
  let sortOption = { postedAt: -1 };
  if (sort === 'postedAt') sortOption = { postedAt: 1 };
  else if (sort === '-postedAt') sortOption = { postedAt: -1 };
  else if (sort === 'salary' || sort === 'salary.min') sortOption = { 'salary.min': 1 };
  else if (sort === '-salary' || sort === '-salary.max') sortOption = { 'salary.max': -1 };
  else if (sort === 'title') sortOption = { title: 1 };
  else if (sort === '-title') sortOption = { title: -1 };

  const skip = (Number(page) - 1) * Number(limit);

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Job.countDocuments(filter)
  ]);

  return {
    jobs,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)) || 1,
    limit: Number(limit)
  };
};

/**
 * Retrieves a single job by MongoDB ObjectId.
 *
 * @param {string} jobId
 * @returns {Promise<Document>}
 */
const getJobById = async (jobId) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw ApiError.badRequest('Invalid job identifier format');
  }

  const job = await Job.findById(jobId).lean();
  if (!job) {
    throw ApiError.notFound('Job listing not found');
  }

  return job;
};

/**
 * Creates a new job listing with normalized skills index.
 *
 * @param {Object} jobData
 * @returns {Promise<Document>}
 */
const createJob = async (jobData) => {
  const skillsNormalized = normalizeSkills(jobData.requirements?.skills || []);

  const job = await Job.create({
    ...jobData,
    skillsNormalized
  });

  logger.info(`Job created: ${job.title} at ${job.company} (${job._id})`);
  return job;
};

/**
 * Updates an existing job listing.
 *
 * @param {string} jobId
 * @param {Object} updateData
 * @returns {Promise<Document>}
 */
const updateJob = async (jobId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw ApiError.badRequest('Invalid job identifier format');
  }

  if (updateData.requirements?.skills) {
    updateData.skillsNormalized = normalizeSkills(updateData.requirements.skills);
  }

  const job = await Job.findByIdAndUpdate(jobId, updateData, {
    new: true,
    runValidators: true
  }).lean();

  if (!job) {
    throw ApiError.notFound('Job listing not found');
  }

  logger.info(`Job updated: ${job.title} (${job._id})`);
  return job;
};

/**
 * Deletes a job listing from the database.
 *
 * @param {string} jobId
 * @returns {Promise<{ message: string }>}
 */
const deleteJob = async (jobId) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw ApiError.badRequest('Invalid job identifier format');
  }

  const job = await Job.findByIdAndDelete(jobId).lean();
  if (!job) {
    throw ApiError.notFound('Job listing not found');
  }

  logger.info(`Job deleted: ${job.title} (${job._id})`);
  return { message: 'Job listing deleted successfully' };
};

module.exports = {
  listJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  normalizeSkills
};
