/**
 * Saved Jobs API Client (api/savedJob.api.js)
 * Fetch client for bookmarking jobs, unsaving, and listing saved jobs.
 */

import { apiClient } from './client.js';

/**
 * Saves/bookmarks a job.
 *
 * @param {string} jobId
 * @param {string} [notes='']
 * @returns {Promise<any>}
 */
export async function saveJobApi(jobId, notes = '') {
  return apiClient(`/jobs/${jobId}/save`, {
    method: 'POST',
    body: { notes }
  });
}

/**
 * Removes a job from saved bookmarks.
 *
 * @param {string} jobId
 * @returns {Promise<any>}
 */
export async function unsaveJobApi(jobId) {
  return apiClient(`/jobs/${jobId}/save`, {
    method: 'DELETE'
  });
}

/**
 * Retrieves paginated list of candidate's bookmarked jobs.
 *
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @returns {Promise<any>}
 */
export async function getSavedJobsApi(page = 1, limit = 10) {
  return apiClient(`/jobs/saved?page=${page}&limit=${limit}`, {
    method: 'GET'
  });
}

/**
 * Checks if a specific job is currently bookmarked by candidate.
 *
 * @param {string} jobId
 * @returns {Promise<any>}
 */
export async function checkJobSavedStatusApi(jobId) {
  return apiClient(`/jobs/${jobId}/saved-status`, {
    method: 'GET'
  });
}
