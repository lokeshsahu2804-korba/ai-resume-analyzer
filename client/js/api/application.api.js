/**
 * Application API Client (api/application.api.js)
 * Fetch client for job application creation, stage tracking, updates, and metrics.
 */

import { apiClient } from './client.js';

/**
 * Submits a new job application.
 *
 * @param {Object} data - { jobId, resumeId, notes, interviewDate }
 * @returns {Promise<any>}
 */
export async function createApplicationApi(data) {
  return apiClient('/applications', {
    method: 'POST',
    body: data
  });
}

/**
 * Retrieves candidate's job applications with optional status filter.
 *
 * @param {Object} [params={}] - { status, page, limit }
 * @returns {Promise<any>}
 */
export async function getApplicationsApi(params = {}) {
  const cleanParams = {};
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
      cleanParams[k] = params[k];
    }
  });

  const queryStr = new URLSearchParams(cleanParams).toString();
  return apiClient(queryStr ? `/applications?${queryStr}` : '/applications', {
    method: 'GET'
  });
}

/**
 * Retrieves aggregate application counts across pipeline stages.
 *
 * @returns {Promise<any>}
 */
export async function getApplicationStatsApi() {
  return apiClient('/applications/stats', {
    method: 'GET'
  });
}

/**
 * Checks existing application for a specific job.
 *
 * @param {string} jobId
 * @returns {Promise<any>}
 */
export async function getJobApplicationStatusApi(jobId) {
  return apiClient(`/applications/job/${jobId}`, {
    method: 'GET'
  });
}

/**
 * Retrieves single application details by ID.
 *
 * @param {string} applicationId
 * @returns {Promise<any>}
 */
export async function getApplicationByIdApi(applicationId) {
  return apiClient(`/applications/${applicationId}`, {
    method: 'GET'
  });
}

/**
 * Updates application stage, notes, or interview schedule.
 *
 * @param {string} applicationId
 * @param {Object} data - { status, notes, interviewDate }
 * @returns {Promise<any>}
 */
export async function updateApplicationApi(applicationId, data) {
  return apiClient(`/applications/${applicationId}`, {
    method: 'PUT',
    body: data
  });
}

/**
 * Withdraws/deletes an application.
 *
 * @param {string} applicationId
 * @returns {Promise<any>}
 */
export async function deleteApplicationApi(applicationId) {
  return apiClient(`/applications/${applicationId}`, {
    method: 'DELETE'
  });
}
