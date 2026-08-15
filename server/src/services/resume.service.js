/**
 * Resume Service (services/resume.service.js)
 * Manages resume document creation, retrieval, deletion, and FastAPI text extraction.
 */

const Resume = require('../models/Resume');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { deleteFile } = require('../config/cloudinary');
const { extractAndParseResume } = require('./fastapi.service');
const notificationService = require('./notification.service');

/**
 * Creates a new Resume document from uploaded file metadata.
 * Note: Quota (resumeAnalysesUsed) is preserved and only consumed during Phase 9 AI analysis.
 *
 * @param {string} userId - ID of authenticated user
 * @param {Object} uploadResult - { fileUrl, cloudinaryPublicId, publicId, originalName, fileSize, mimeType }
 * @returns {Promise<Document>}
 */
const createResumeRecord = async (userId, uploadResult) => {
  const resume = await Resume.create({
    userId: userId,
    file: {
      originalName: uploadResult.originalName,
      fileUrl: uploadResult.fileUrl,
      cloudinaryPublicId: uploadResult.cloudinaryPublicId || uploadResult.publicId || '',
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType || 'application/pdf',
      uploadedAt: new Date()
    },
    status: 'uploaded'
  });

  return resume;
};

/**
 * Triggers FastAPI text extraction and structured parsing for a specific resume.
 *
 * @param {string} resumeId
 * @param {string} userId
 * @returns {Promise<Document>}
 */
const processResumeById = async (resumeId, userId) => {
  const resume = await Resume.findOne({ _id: resumeId, userId: userId });

  if (!resume) {
    throw ApiError.notFound('Resume document not found or access denied');
  }

  // Update status to processing
  resume.status = 'processing';
  await resume.save();

  try {
    const result = await extractAndParseResume({
      fileUrl: resume.file.fileUrl,
      resumeId: resume._id,
      originalName: resume.file.originalName
    });

    // Update with extracted and parsed data
    resume.extractedText = result.extractedText;
    resume.parsed = result.parsed;
    resume.status = 'parsed';

    await resume.save();
    logger.info(`Resume ${resume._id} successfully parsed: ${result.parsed.skills?.length || 0} skills found`);

    // Non-blocking notification dispatch
    notificationService
      .sendNotification({
        userId,
        type: 'resume_processed',
        title: 'Resume Processed',
        message: `"${resume.file?.originalName || 'Resume'}" parsed successfully (${result.parsed.skills?.length || 0} skills detected).`,
        data: {
          resumeId: resume._id,
          skillsCount: result.parsed.skills?.length || 0,
          originalName: resume.file?.originalName
        }
      })
      .catch((nErr) => logger.warn(`Resume notification error: ${nErr.message}`));

    return resume;
  } catch (err) {
    logger.error(`Failed to process resume ${resume._id}: ${err.message}`);
    resume.status = 'failed';
    await resume.save().catch(() => {});

    // Non-blocking error notification dispatch
    notificationService
      .sendNotification({
        userId,
        type: 'resume_processing_failed',
        title: 'Resume Processing Failed',
        message: `We could not parse text from "${resume.file?.originalName || 'uploaded resume'}". Please verify the PDF format.`,
        data: {
          resumeId: resume._id,
          error: err.message
        }
      })
      .catch((nErr) => logger.warn(`Resume error notification failed: ${nErr.message}`));

    throw err;
  }
};

/**
 * Safely triggers background FastAPI processing without blocking upload responses.
 *
 * @param {string} resumeId
 * @param {string} userId
 */
const triggerBackgroundResumeProcessing = (resumeId, userId) => {
  setImmediate(async () => {
    try {
      await processResumeById(resumeId, userId);
    } catch (err) {
      logger.warn(`Background resume processing error for ${resumeId}: ${err.message}`);
    }
  });
};

/**
 * Retrieves paginated resumes for the authenticated user.
 *
 * @param {string} userId
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @returns {Promise<{ resumes: Array, total: number, page: number, pages: number }>}
 */
const getUserResumes = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [resumes, total] = await Promise.all([
    Resume.find({ userId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Resume.countDocuments({ userId: userId })
  ]);

  return {
    resumes,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit)
  };
};

/**
 * Retrieves a single resume by ID for the authenticated user.
 *
 * @param {string} resumeId
 * @param {string} userId
 * @returns {Promise<Document>}
 */
const getResumeById = async (resumeId, userId) => {
  const resume = await Resume.findOne({ _id: resumeId, userId: userId });

  if (!resume) {
    throw ApiError.notFound('Resume document not found');
  }

  return resume;
};

/**
 * Deletes a resume document and cleans up cloud/local storage.
 *
 * @param {string} resumeId
 * @param {string} userId
 * @returns {Promise<Document>}
 */
const deleteResumeById = async (resumeId, userId) => {
  const resume = await Resume.findOne({ _id: resumeId, userId: userId });

  if (!resume) {
    throw ApiError.notFound('Resume document not found');
  }

  // Clean up physical file storage (Cloudinary or local disk)
  try {
    await deleteFile({
      fileUrl: resume.file?.fileUrl,
      cloudinaryPublicId: resume.file?.cloudinaryPublicId
    });
  } catch (storageErr) {
    logger.warn(`Failed to delete storage file for resume ${resumeId}: ${storageErr.message}`);
  }

  await Resume.deleteOne({ _id: resumeId, userId: userId });
  return resume;
};

module.exports = {
  createResumeRecord,
  processResumeById,
  triggerBackgroundResumeProcessing,
  getUserResumes,
  getResumeById,
  deleteResumeById
};
