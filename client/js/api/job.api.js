/**
 * Job API Client (api/job.api.js)
 * Fetch client for browsing, filtering, and managing job postings.
 */

import { apiClient } from './client.js';

/**
 * Lists active job postings with query filters.
 *
 * @param {Object} [params={}] - { search, experienceLevel, type, location, minSalary, maxSalary, page, limit, sort }
 * @returns {Promise<any>}
 */
export async function getJobsApi(params = {}) {
  const cleanParams = {};
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
      cleanParams[k] = params[k];
    }
  });

  const queryStr = new URLSearchParams(cleanParams).toString();
  return apiClient(queryStr ? `/jobs?${queryStr}` : '/jobs', {
    method: 'GET'
  });
}

/**
 * Retrieves full details for a single job posting by ID.
 *
 * @param {string} jobId
 * @returns {Promise<any>}
 */
export async function getJobByIdApi(jobId) {
  return apiClient(`/jobs/${jobId}`, {
    method: 'GET'
  });
}

/**
 * Creates a new job posting (Admin only).
 *
 * @param {Object} jobData
 * @returns {Promise<any>}
 */
export async function createJobApi(jobData) {
  return apiClient('/jobs', {
    method: 'POST',
    body: JSON.stringify(jobData)
  });
}

/**
 * Updates an existing job posting (Admin only).
 *
 * @param {string} jobId
 * @param {Object} updateData
 * @returns {Promise<any>}
 */
export async function updateJobApi(jobId, updateData) {
  return apiClient(`/jobs/${jobId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
}

/**
 * Deletes a job posting (Admin only).
 *
 * @param {string} jobId
 * @returns {Promise<any>}
 */
export async function deleteJobApi(jobId) {
  return apiClient(`/jobs/${jobId}`, {
    method: 'DELETE'
  });
}
