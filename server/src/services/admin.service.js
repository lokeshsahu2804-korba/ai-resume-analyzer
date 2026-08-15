/**
 * Admin Service Layer (services/admin.service.js)
 * Implements real platform analytics, system diagnostics, user management, role mutation, plan updates, and cascading deletion.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Resume = require('../models/Resume');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const Job = require('../models/Job');
const SavedJob = require('../models/SavedJob');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { deleteFile } = require('../utils/fileUpload.util');

/**
 * Retrieves aggregate platform statistics from real MongoDB collections.
 *
 * @returns {Promise<Object>}
 */
const getPlatformAnalytics = async () => {
  const [
    totalUsers,
    freeUsers,
    premiumUsers,
    adminUsers,
    totalResumes,
    parsedResumes,
    resumesAnalyzed,
    totalJobs,
    activeJobs,
    totalSavedJobs,
    totalApplications,
    appliedApps,
    interviewingApps,
    offeredApps,
    rejectedApps,
    withdrawnApps,
    recentUsers,
    recentApplications
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ 'subscription.plan': 'free' }),
    User.countDocuments({ 'subscription.plan': 'premium' }),
    User.countDocuments({ role: 'admin' }),
    Resume.countDocuments(),
    Resume.countDocuments({ status: { $in: ['parsed', 'analyzed'] } }),
    ResumeAnalysis.countDocuments(),
    Job.countDocuments(),
    Job.countDocuments({ isActive: true }),
    SavedJob.countDocuments(),
    Application.countDocuments(),
    Application.countDocuments({ status: 'applied' }),
    Application.countDocuments({ status: 'interviewing' }),
    Application.countDocuments({ status: 'offered' }),
    Application.countDocuments({ status: 'rejected' }),
    Application.countDocuments({ status: 'withdrawn' }),
    User.find()
      .select('name email role subscription createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Application.find()
      .populate('userId', 'name email')
      .populate('jobId', 'title company location')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
  ]);

  return {
    overview: {
      totalUsers,
      freeUsers,
      premiumUsers,
      adminUsers,
      totalResumes,
      parsedResumes,
      resumesAnalyzed,
      totalJobs,
      activeJobs,
      totalSavedJobs,
      totalApplications
    },
    applicationsByStage: {
      applied: appliedApps,
      interviewing: interviewingApps,
      offered: offeredApps,
      rejected: rejectedApps,
      withdrawn: withdrawnApps
    },
    recentActivity: {
      recentUsers,
      recentApplications: recentApplications.map((app) => ({
        _id: app._id,
        userName: app.userId?.name || 'Unknown User',
        userEmail: app.userId?.email || '',
        jobTitle: app.jobId?.title || 'Unknown Job',
        company: app.jobId?.company || 'Unknown Company',
        status: app.status,
        matchScore: app.matchScore,
        createdAt: app.createdAt
      }))
    }
  };
};

/**
 * Executes a live health check across Express, MongoDB Atlas, and FastAPI.
 *
 * @returns {Promise<Object>}
 */
const getSystemHealth = async () => {
  const timestamp = new Date().toISOString();

  // 1. Express / Node.js
  const expressHealth = {
    status: 'healthy',
    uptimeSeconds: Math.round(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    nodeVersion: process.version
  };

  // 2. MongoDB Atlas
  let mongoHealth = { status: 'healthy', database: 'connected' };
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      mongoHealth.status = 'healthy';
      mongoHealth.database = mongoose.connection.name || 'connected';
    } else {
      mongoHealth.status = 'unhealthy';
      mongoHealth.database = 'disconnected';
    }
  } catch (err) {
    mongoHealth.status = 'unhealthy';
    mongoHealth.error = err.message;
  }

  // 3. FastAPI AI Microservice
  let fastApiHealth = { status: 'healthy', endpoint: process.env.FASTAPI_URL || 'http://localhost:8000' };
  try {
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${fastApiUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      fastApiHealth.status = 'healthy';
      fastApiHealth.version = data.version || '1.0.0';
    } else {
      fastApiHealth.status = 'degraded';
      fastApiHealth.statusCode = response.status;
    }
  } catch (err) {
    fastApiHealth.status = 'unhealthy';
    fastApiHealth.error = err.message || 'Service unreachable';
  }

  const isOverallHealthy =
    expressHealth.status === 'healthy' &&
    mongoHealth.status === 'healthy' &&
    fastApiHealth.status === 'healthy';

  return {
    overallStatus: isOverallHealthy ? 'healthy' : 'degraded',
    timestamp,
    services: {
      express: expressHealth,
      mongodb: mongoHealth,
      fastapi: fastApiHealth
    }
  };
};

/**
 * Lists registered users with pagination, text search, role filter, and subscription plan filter.
 *
 * @param {Object} params - { page, limit, search, role, plan, sort }
 * @returns {Promise<{ users: Array, total: number, page: number, pages: number }>}
 */
const listUsers = async ({ page = 1, limit = 10, search = '', role = '', plan = '', sort = '-createdAt' }) => {
  const query = {};

  if (search) {
    const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: sanitizedSearch, $options: 'i' } },
      { email: { $regex: sanitizedSearch, $options: 'i' } }
    ];
  }

  if (role) {
    query.role = role;
  }

  if (plan) {
    query['subscription.plan'] = plan;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [rawUsers, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(query)
  ]);

  // Enrich each user with aggregate activity metrics
  const enrichedUsers = await Promise.all(
    rawUsers.map(async (u) => {
      const [resumesCount, analysesCount, applicationsCount] = await Promise.all([
        Resume.countDocuments({ userId: u._id }),
        ResumeAnalysis.countDocuments({ userId: u._id }),
        Application.countDocuments({ userId: u._id })
      ]);

      return {
        ...u,
        activity: {
          resumesCount,
          analysesCount,
          applicationsCount
        }
      };
    })
  );

  return {
    users: enrichedUsers,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)) || 1
  };
};

/**
 * Retrieves full user details, activity records, and quota status.
 *
 * @param {string} userId
 * @returns {Promise<Object>}
 */
const getUserDetails = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw ApiError.badRequest('Invalid user identifier format');
  }

  const user = await User.findById(userId).select('-password').lean();
  if (!user) {
    throw ApiError.notFound('User account not found');
  }

  const [resumes, analyses, savedJobs, applications] = await Promise.all([
    Resume.find({ userId }).sort({ createdAt: -1 }).lean(),
    ResumeAnalysis.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    SavedJob.find({ userId }).populate('jobId', 'title company location').lean(),
    Application.find({ userId }).populate('jobId', 'title company location').sort({ createdAt: -1 }).lean()
  ]);

  return {
    user,
    activity: {
      resumesCount: resumes.length,
      resumes: resumes.map((r) => ({
        _id: r._id,
        originalName: r.file?.originalName,
        status: r.status,
        isActive: r.isActive,
        createdAt: r.createdAt
      })),
      analysesCount: analyses.length,
      latestAnalysis: analyses[0]
        ? {
            _id: analyses[0]._id,
            overallScore: analyses[0].atsScore?.overall,
            categoryRatings: analyses[0].categoryRatings,
            createdAt: analyses[0].createdAt
          }
        : null,
      savedJobsCount: savedJobs.length,
      applicationsCount: applications.length,
      applications: applications.map((a) => ({
        _id: a._id,
        jobTitle: a.jobId?.title || 'Job Listing',
        company: a.jobId?.company || 'Company',
        status: a.status,
        matchScore: a.matchScore,
        appliedAt: a.appliedAt || a.createdAt
      }))
    }
  };
};

/**
 * Updates a user's platform role with self-demotion protection.
 *
 * @param {string} adminUserId
 * @param {string} targetUserId
 * @param {string} newRole - 'user' | 'admin'
 * @returns {Promise<Document>}
 */
const updateUserRole = async (adminUserId, targetUserId, newRole) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw ApiError.badRequest('Invalid target user identifier format');
  }

  // Prevent admin from demoting their own account
  if (adminUserId.toString() === targetUserId.toString() && newRole !== 'admin') {
    throw ApiError.badRequest('Admins cannot demote their own account.');
  }

  const updatedUser = await User.findByIdAndUpdate(
    targetUserId,
    { $set: { role: newRole } },
    { new: true }
  ).select('-password');

  if (!updatedUser) {
    throw ApiError.notFound('User account not found');
  }

  logger.info(`Admin ${adminUserId} updated role of user ${targetUserId} to '${newRole}'`);
  return updatedUser;
};

/**
 * Updates a user's subscription plan and analysis quota limit.
 *
 * @param {string} targetUserId
 * @param {Object} updates - { plan, resumeAnalysesLimit, resumeAnalysesUsed }
 * @returns {Promise<Document>}
 */
const updateUserPlan = async (targetUserId, { plan, resumeAnalysesLimit, resumeAnalysesUsed }) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw ApiError.badRequest('Invalid target user identifier format');
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw ApiError.notFound('User account not found');
  }

  if (plan) {
    user.subscription.plan = plan;
    if (plan === 'premium') {
      user.subscription.status = 'active';
      user.usageLimits.resumeAnalysesLimit = 999999;
    } else {
      user.subscription.status = 'inactive';
      user.usageLimits.resumeAnalysesLimit = 3;
    }
  }

  if (resumeAnalysesLimit !== undefined) {
    user.usageLimits.resumeAnalysesLimit = Number(resumeAnalysesLimit);
  }

  if (resumeAnalysesUsed !== undefined) {
    user.usageLimits.resumeAnalysesUsed = Number(resumeAnalysesUsed);
  }

  await user.save();
  logger.info(`Admin updated plan for user ${targetUserId}: plan=${user.subscription.plan}, limit=${user.usageLimits.resumeAnalysesLimit}`);

  const cleanUser = user.toObject();
  delete cleanUser.password;
  return cleanUser;
};

/**
 * Permanently deletes a user account with cascading cleanup across all dependent collections and physical files.
 *
 * @param {string} adminUserId
 * @param {string} targetUserId
 * @returns {Promise<{ deletedUserId: string }>}
 */
const deleteUserCascade = async (adminUserId, targetUserId) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw ApiError.badRequest('Invalid target user identifier format');
  }

  // Prevent admin from deleting their own account
  if (adminUserId.toString() === targetUserId.toString()) {
    throw ApiError.badRequest('Admins cannot delete their own account.');
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw ApiError.notFound('User account not found');
  }

  // 1. Clean up physical resume files on disk/Cloudinary
  const userResumes = await Resume.find({ userId: targetUserId });
  for (const r of userResumes) {
    try {
      await deleteFile({
        fileUrl: r.file?.fileUrl,
        cloudinaryPublicId: r.file?.cloudinaryPublicId
      });
    } catch (err) {
      logger.warn(`Failed to delete physical resume file during cascade: ${err.message}`);
    }
  }

  // 2. Cascade delete from all dependent collections
  await Promise.all([
    Resume.deleteMany({ userId: targetUserId }),
    ResumeAnalysis.deleteMany({ userId: targetUserId }),
    SavedJob.deleteMany({ userId: targetUserId }),
    Application.deleteMany({ userId: targetUserId }),
    Notification.deleteMany({ userId: targetUserId }),
    Payment.deleteMany({ userId: targetUserId }),
    User.findByIdAndDelete(targetUserId)
  ]);

  logger.info(`Admin ${adminUserId} performed cascade deletion of user ${targetUserId} (${user.email})`);

  return {
    deletedUserId: targetUserId,
    email: user.email
  };
};

module.exports = {
  getPlatformAnalytics,
  getSystemHealth,
  listUsers,
  getUserDetails,
  updateUserRole,
  updateUserPlan,
  deleteUserCascade
};
