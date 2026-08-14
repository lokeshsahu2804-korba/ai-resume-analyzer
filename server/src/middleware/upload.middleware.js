/**
 * Resume Upload & Validation Middleware (middleware/upload.middleware.js)
 * Enforces multipart handling, 5MB file limits, MIME checks, and PDF magic bytes validation.
 */

const multer = require('multer');
const ApiError = require('../utils/ApiError');

const MAX_FILE_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5) * 1024 * 1024;

// Use memory storage for in-memory buffer validation and streaming
const storage = multer.memoryStorage();

// File type filter: MIME validation
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest('Only PDF documents (.pdf) are supported'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  },
  fileFilter
});

/**
 * Express middleware that handles single resume file upload and verifies PDF magic bytes.
 */
const uploadResumeMiddleware = (req, res, next) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (err) => {
    // 1. Handle Multer Errors (e.g. Size limit)
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          ApiError.badRequest(
            `File size exceeds maximum allowed limit of ${parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5}MB`
          )
        );
      }
      return next(ApiError.badRequest(`File upload error: ${err.message}`));
    } else if (err) {
      return next(err);
    }

    // 2. Verify file presence
    if (!req.file) {
      return next(ApiError.badRequest('Please select a PDF file to upload'));
    }

    // 3. Verify Magic Bytes: First 4 bytes must be "%PDF" (0x25 0x50 0x44 0x46)
    const buffer = req.file.buffer;
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x25 || // %
      buffer[1] !== 0x50 || // P
      buffer[2] !== 0x44 || // D
      buffer[3] !== 0x46 // F
    ) {
      return next(ApiError.badRequest('The uploaded file is not a valid PDF document'));
    }

    next();
  });
};

module.exports = {
  uploadResumeMiddleware,
  MAX_FILE_SIZE_BYTES
};
