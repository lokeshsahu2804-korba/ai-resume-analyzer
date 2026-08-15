/**
 * Job Matching API Client (api/jobMatching.api.js)
 * Fetch client for personalized recommendations, match compatibility, and AI explanations.
 */

import { apiClient } from './client.js';

/**
 * Retrieves active job recommendations ranked by match score.
 *
 * @param {Object} [params={}] - { resumeId, minMatch, page, limit }
 * @returns {Promise<any>}
 */
export async function getRecommendedJobsApi(params = {}) {
  const cleanParams = {};
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
      cleanParams[k] = params[k];
    }
  });

  const queryStr = new URLSearchParams(cleanParams).toString();
  return apiClient(queryStr ? `/jobs/recommended?${queryStr}` : '/jobs/recommended', {
    method: 'GET'
  });
}

/**
 * Retrieves deterministic 6-dimension match score and skill gaps for a job.
 *
 * @param {string} jobId
 * @param {string} [resumeId]
 * @returns {Promise<any>}
 */
export async function getJobMatchApi(jobId, resumeId) {
  const queryStr = resumeId ? `?resumeId=${encodeURIComponent(resumeId)}` : '';
  return apiClient(`/jobs/${jobId}/match${queryStr}`, {
    method: 'GET'
  });
}

/**
 * Retrieves deep AI semantic match explanation and interview advice.
 *
 * @param {string} jobId
 * @param {string} [resumeId]
 * @returns {Promise<any>}
 */
export async function getJobMatchExplanationApi(jobId, resumeId) {
  const queryStr = resumeId ? `?resumeId=${encodeURIComponent(resumeId)}` : '';
  return apiClient(`/jobs/${jobId}/match-explanation${queryStr}`, {
    method: 'GET'
  });
}
