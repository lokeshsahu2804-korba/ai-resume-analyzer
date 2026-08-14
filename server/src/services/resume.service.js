/**
 * Resume Business Logic Service (services/resume.service.js)
 * Handles PDF storage, database persistence, listing, details retrieval, and deletion.
 */

const mongoose = require('mongoose');
const Resume = require('../models/Resume');
const { uploadFile, deleteFile } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

/**
 * Uploads a resume PDF to Cloudinary/local storage and persists metadata in MongoDB.
 * Note: Does NOT consume AI analysis quota here (quota is consumed during Phase 9 AI analysis).
 *
 * @param {string} userId - Authenticated user ID
 * @param {Buffer} fileBuffer - PDF file buffer
 * @param {Object} fileInfo - Multer file object ({ originalname, mimetype, size })
 * @returns {Promise<Object>} Created Resume document
 */
const uploadResume = async (userId, fileBuffer, fileInfo) => {
  // 1. Upload to cloud or local storage
  const storageResult = await uploadFile(fileBuffer, {
    originalName: fileInfo.originalname,
    mimeType: fileInfo.mimetype,
    userId
  });

  // 2. Persist resume document in MongoDB
  const resume = new Resume({
    userId,
    file: {
      originalName: fileInfo.originalname,
      fileUrl: storageResult.fileUrl,
      cloudinaryPublicId: storageResult.cloudinaryPublicId,
      fileSize: fileInfo.size,
      mimeType: fileInfo.mimetype,
      uploadedAt: new Date()
    },
    status: 'uploaded',
    isActive: true
  });

  await resume.save();
  return resume;
};

/**
 * Retrieves a paginated list of active resumes for the authenticated user.
 *
 * @param {string} userId - User ID
 * @param {Object} query - { page, limit }
 * @returns {Promise<{ resumes: Array, pagination: Object }>}
 */
const listResumes = async (userId, { page = 1, limit = 10 }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const query = { userId, isActive: true };

  const [resumes, total] = await Promise.all([
    Resume.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Resume.countDocuments(query)
  ]);

  return {
    resumes,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  };
};

/**
 * Retrieves a single resume by ID with strict user ownership enforcement.
 *
 * @param {string} userId - User ID
 * @param {string} resumeId - Resume ObjectId
 * @returns {Promise<Object>} Resume document
 */
const getResumeById = async (userId, resumeId) => {
  if (!mongoose.Types.ObjectId.isValid(resumeId)) {
    throw ApiError.notFound('Resume document not found');
  }

  const resume = await Resume.findOne({ _id: resumeId, userId, isActive: true });
  if (!resume) {
    throw ApiError.notFound('Resume document not found');
  }

  return resume;
};

/**
 * Deletes a resume document from MongoDB and deletes the physical file from Cloudinary/disk.
 *
 * @param {string} userId - User ID
 * @param {string} resumeId - Resume ObjectId
 * @returns {Promise<void>}
 */
const deleteResume = async (userId, resumeId) => {
  if (!mongoose.Types.ObjectId.isValid(resumeId)) {
    throw ApiError.notFound('Resume document not found');
  }

  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) {
    throw ApiError.notFound('Resume document not found');
  }

  // 1. Delete stored file from Cloudinary or local disk
  if (resume.file) {
    await deleteFile(resume.file);
  }

  // 2. Remove document from MongoDB Atlas
  await Resume.findByIdAndDelete(resumeId);
};

module.exports = {
  uploadResume,
  listResumes,
  getResumeById,
  deleteResume
};
