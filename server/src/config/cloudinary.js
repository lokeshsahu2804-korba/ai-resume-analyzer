/**
 * Dual-Mode Storage Service (config/cloudinary.js)
 * Uploads files to Cloudinary when credentials are provided, with automatic fallback
 * to local filesystem storage (server/uploads/resumes/) for zero-config offline testing.
 */

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configure Cloudinary SDK from environment
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Determines whether valid, non-placeholder Cloudinary credentials exist.
 *
 * @returns {boolean}
 */
const isCloudinaryConfigured = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  return (
    Boolean(CLOUDINARY_CLOUD_NAME) &&
    Boolean(CLOUDINARY_API_KEY) &&
    Boolean(CLOUDINARY_API_SECRET) &&
    !CLOUDINARY_CLOUD_NAME.includes('your_') &&
    !CLOUDINARY_API_KEY.includes('your_')
  );
};

// Local storage directory
const LOCAL_UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'resumes');

// Ensure local directory exists
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

/**
 * Uploads a file buffer either to Cloudinary or to local disk storage.
 *
 * @param {Buffer} fileBuffer - The file binary buffer
 * @param {Object} options - { originalName, mimeType, userId }
 * @returns {Promise<{ fileUrl: string, cloudinaryPublicId: string, storageType: 'cloudinary'|'local' }>}
 */
const uploadFile = async (fileBuffer, { originalName, mimeType, userId }) => {
  const uniqueId = crypto.randomUUID();
  const safeOriginalName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');

  // 1. Cloudinary Upload if configured
  if (isCloudinaryConfigured()) {
    return new Promise((resolve, reject) => {
      const publicId = `resume_${userId}_${Date.now()}_${uniqueId}`;
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'ai-resume-analyzer/resumes',
          public_id: publicId,
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            fileUrl: result.secure_url,
            cloudinaryPublicId: result.public_id,
            storageType: 'cloudinary'
          });
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  // 2. Local Filesystem Fallback
  const filename = `resume_${userId}_${Date.now()}_${uniqueId}_${safeOriginalName}`;
  const filePath = path.join(LOCAL_UPLOADS_DIR, filename);

  await fs.promises.writeFile(filePath, fileBuffer);

  // Return relative static URL served by Express
  const fileUrl = `/uploads/resumes/${filename}`;

  return {
    fileUrl,
    cloudinaryPublicId: filename,
    storageType: 'local'
  };
};

/**
 * Deletes a stored file from either Cloudinary or local disk storage.
 *
 * @param {Object} fileMetadata - { fileUrl, cloudinaryPublicId }
 * @returns {Promise<void>}
 */
const deleteFile = async (fileMetadata) => {
  if (!fileMetadata) return;

  const { fileUrl, cloudinaryPublicId } = fileMetadata;

  // Cloudinary deletion
  if (fileUrl && fileUrl.startsWith('http') && isCloudinaryConfigured() && cloudinaryPublicId) {
    try {
      await cloudinary.uploader.destroy(cloudinaryPublicId, { resource_type: 'raw' });
    } catch (err) {
      // Non-blocking cleanup warning
      console.warn(`Failed to delete Cloudinary file: ${cloudinaryPublicId}`, err.message);
    }
    return;
  }

  // Local filesystem deletion
  if (cloudinaryPublicId) {
    const localFilePath = path.join(LOCAL_UPLOADS_DIR, path.basename(cloudinaryPublicId));
    try {
      if (fs.existsSync(localFilePath)) {
        await fs.promises.unlink(localFilePath);
      }
    } catch (err) {
      console.warn(`Failed to delete local file: ${localFilePath}`, err.message);
    }
  }
};

module.exports = {
  isCloudinaryConfigured,
  uploadFile,
  deleteFile,
  LOCAL_UPLOADS_DIR
};
