/**
 * Resume API Endpoints (api/resume.api.js)
 */

import { apiClient } from './client.js';

const BASE_URL =
  typeof API_BASE_URL !== 'undefined'
    ? API_BASE_URL
    : typeof window !== 'undefined' && window.API_BASE_URL
      ? window.API_BASE_URL
      : 'https://ai-resume-analyzer-rn7x.onrender.com/api';

/**
 * Uploads a multipart/form-data resume PDF file.
 *
 * @param {FormData} formData - FormData containing 'file'
 * @returns {Promise<any>}
 */
export async function uploadResumeApi(formData) {
  const url = `${BASE_URL}/resumes/upload`;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include' // Send & receive httpOnly session cookie
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        result?.error?.message ||
        (result?.error?.details && result.error.details.map((d) => d.message).join(', ')) ||
        `HTTP Error ${response.status}`;

      const error = new Error(errorMsg);
      error.statusCode = response.status;
      error.code = result?.error?.code || 'UNKNOWN_ERROR';
      throw error;
    }

    return result;
  } catch (err) {
    if (!err.statusCode) {
      err.message = 'Unable to connect to server. Please check your internet connection.';
    }
    throw err;
  }
}

/**
 * Triggers or re-runs FastAPI text extraction and structured parsing for a resume.
 *
 * @param {string} resumeId
 * @returns {Promise<any>}
 */
export async function processResumeApi(resumeId) {
  return apiClient(`/resumes/${resumeId}/process`, {
    method: 'POST'
  });
}

/**
 * Lists user resumes with pagination.
 *
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @returns {Promise<any>}
 */
export async function getResumesApi(page = 1, limit = 10) {
  return apiClient(`/resumes?page=${page}&limit=${limit}`, {
    method: 'GET'
  });
}

/**
 * Retrieves resume details by ID.
 *
 * @param {string} resumeId
 * @returns {Promise<any>}
 */
export async function getResumeByIdApi(resumeId) {
  return apiClient(`/resumes/${resumeId}`, {
    method: 'GET'
  });
}

/**
 * Deletes a resume by ID.
 *
 * @param {string} resumeId
 * @returns {Promise<any>}
 */
export async function deleteResumeApi(resumeId) {
  return apiClient(`/resumes/${resumeId}`, {
    method: 'DELETE'
  });
}
