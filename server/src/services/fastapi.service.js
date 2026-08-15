/**
 * FastAPI Microservice Communication Bridge (services/fastapi.service.js)
 * Inter-service client sending resume PDF URLs and analysis requests to FastAPI with X-Internal-API-Key authentication.
 */

const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

/**
 * Sends a resume document to the FastAPI AI service for text extraction and section parsing.
 *
 * @param {Object} params - { fileUrl, resumeId, originalName }
 * @returns {Promise<{ extractedText: string, parsed: Object, pageCount: number, wordCount: number }>}
 */
const extractAndParseResume = async ({ fileUrl, resumeId, originalName }) => {
  if (!INTERNAL_API_KEY) {
    logger.error('INTERNAL_API_KEY is not configured in server environment');
    throw ApiError.internal('Internal AI service authentication is not configured');
  }

  const endpoint = `${FASTAPI_URL}/api/process-resume`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': INTERNAL_API_KEY
      },
      body: JSON.stringify({
        fileUrl,
        resumeId: resumeId ? resumeId.toString() : '',
        originalName: originalName || 'Resume.pdf'
      })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = result?.detail || `FastAPI error (HTTP ${response.status})`;
      logger.warn(`FastAPI process-resume failed: ${errorMsg}`);

      if (response.status === 401) {
        throw ApiError.internal('AI service authentication failed (invalid internal key)');
      }
      if (response.status === 422) {
        throw ApiError.badRequest(`Resume extraction error: ${errorMsg}`);
      }
      if (response.status === 504) {
        throw ApiError.serviceUnavailable('AI service timed out downloading resume PDF');
      }

      throw ApiError.badRequest(`Failed to process resume: ${errorMsg}`);
    }

    return result;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    logger.error(`Failed to connect to FastAPI at ${FASTAPI_URL}: ${err.message}`);
    throw ApiError.serviceUnavailable(
      'AI resume processing service is currently unreachable. Please ensure the AI service is running.'
    );
  }
};

/**
 * Sends extracted resume text and target job description to FastAPI for Gemini AI ATS scoring.
 *
 * @param {Object} params - { resumeId, extractedText, parsed, jobDescription, isPremium }
 * @returns {Promise<Object>}
 */
const analyzeResumeWithFastAPI = async ({ resumeId, extractedText, parsed, jobDescription, isPremium }) => {
  if (!INTERNAL_API_KEY) {
    logger.error('INTERNAL_API_KEY is not configured in server environment');
    throw ApiError.internal('Internal AI service authentication is not configured');
  }

  const endpoint = `${FASTAPI_URL}/api/analyze-resume`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': INTERNAL_API_KEY
      },
      body: JSON.stringify({
        resumeId: resumeId ? resumeId.toString() : '',
        extractedText: extractedText || '',
        parsed: parsed || {},
        jobDescription: jobDescription || '',
        isPremium: Boolean(isPremium)
      })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = result?.detail || `FastAPI analyze error (HTTP ${response.status})`;
      logger.warn(`FastAPI analyze-resume failed: ${errorMsg}`);

      if (response.status === 401) {
        throw ApiError.internal('AI service authentication failed (invalid internal key)');
      }
      if (response.status === 400) {
        throw ApiError.badRequest(`AI analysis error: ${errorMsg}`);
      }

      throw ApiError.badRequest(`Failed to analyze resume: ${errorMsg}`);
    }

    return result;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    logger.error(`Failed to connect to FastAPI at ${FASTAPI_URL}: ${err.message}`);
    throw ApiError.serviceUnavailable(
      'AI resume analysis service is currently unreachable. Please ensure the AI service is running.'
    );
  }
};

module.exports = {
  extractAndParseResume,
  analyzeResumeWithFastAPI
};
