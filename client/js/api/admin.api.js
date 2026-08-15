/**
 * Admin API Client (api/admin.api.js)
 * Fetch client for platform analytics, system health diagnostics, and user account management.
 */

import { apiClient } from './client.js';

/**
 * Retrieves aggregate platform statistics.
 *
 * @returns {Promise<any>}
 */
export async function getAdminStatsApi() {
  return apiClient('/admin/stats', {
    method: 'GET'
  });
}

/**
 * Retrieves live system health report across Express, MongoDB Atlas, and FastAPI.
 *
 * @returns {Promise<any>}
 */
export async function getAdminHealthApi() {
  return apiClient('/admin/health-check', {
    method: 'GET'
  });
}

/**
 * Retrieves paginated list of users with search and filter parameters.
 *
 * @param {Object} [params={}] - { page, limit, search, role, plan, sort }
 * @returns {Promise<any>}
 */
export async function getAdminUsersApi(params = {}) {
  const cleanParams = {};
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
      cleanParams[k] = params[k];
    }
  });

  const queryStr = new URLSearchParams(cleanParams).toString();
  return apiClient(queryStr ? `/admin/users?${queryStr}` : '/admin/users', {
    method: 'GET'
  });
}

/**
 * Retrieves single user details and activity history.
 *
 * @param {string} userId
 * @returns {Promise<any>}
 */
export async function getAdminUserDetailsApi(userId) {
  return apiClient(`/admin/users/${userId}`, {
    method: 'GET'
  });
}

/**
 * Updates a user's platform role (user <-> admin).
 *
 * @param {string} userId
 * @param {string} role - 'user' | 'admin'
 * @returns {Promise<any>}
 */
export async function updateAdminUserRoleApi(userId, role) {
  return apiClient(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: { role }
  });
}

/**
 * Updates a user's subscription plan and analysis quota limit.
 *
 * @param {string} userId
 * @param {Object} data - { plan, resumeAnalysesLimit, resumeAnalysesUsed }
 * @returns {Promise<any>}
 */
export async function updateAdminUserPlanApi(userId, data) {
  return apiClient(`/admin/users/${userId}/plan`, {
    method: 'PUT',
    body: data
  });
}

/**
 * Permanently deletes a user account with cascading cleanup.
 *
 * @param {string} userId
 * @returns {Promise<any>}
 */
export async function deleteAdminUserApi(userId) {
  return apiClient(`/admin/users/${userId}`, {
    method: 'DELETE'
  });
}
