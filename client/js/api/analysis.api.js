/**
 * Analysis API Client (api/analysis.api.js)
 * Endpoints for triggering AI resume analysis and retrieving ATS evaluation reports.
 */

import { apiClient } from './client.js';

/**
 * Triggers AI ATS analysis on a specific resume document.
 *
 * @param {string} resumeId
 * @param {string} [jobDescription=""]
 * @returns {Promise<any>}
 */
export async function triggerAnalysisApi(resumeId, jobDescription = '') {
  return apiClient(`/analyses/resume/${resumeId}`, {
    method: 'POST',
    body: JSON.stringify({ jobDescription })
  });
}

/**
 * Retrieves a detailed analysis report by ID.
 *
 * @param {string} analysisId
 * @returns {Promise<any>}
 */
export async function getAnalysisByIdApi(analysisId) {
  return apiClient(`/analyses/${analysisId}`, {
    method: 'GET'
  });
}

/**
 * Retrieves paginated list of past analyses for current user.
 *
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @returns {Promise<any>}
 */
export async function getUserAnalysesApi(page = 1, limit = 10) {
  return apiClient(`/analyses?page=${page}&limit=${limit}`, {
    method: 'GET'
  });
}

/**
 * Retrieves latest analysis report for a specific resume document.
 *
 * @param {string} resumeId
 * @returns {Promise<any>}
 */
export async function getLatestAnalysisForResumeApi(resumeId) {
  return apiClient(`/analyses/resume/${resumeId}/latest`, {
    method: 'GET'
  });
}
