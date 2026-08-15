/**
 * Notification API Client (api/notification.api.js)
 * Fetch client for notification listings, unread badges, status updates, and deletions.
 */

import { apiClient } from './client.js';

/**
 * Retrieves paginated notifications with filters.
 *
 * @param {Object} [params={}] - { page, limit, isRead, type, sort }
 * @returns {Promise<any>}
 */
export async function getNotificationsApi(params = {}) {
  const cleanParams = {};
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
      cleanParams[k] = params[k];
    }
  });

  const queryStr = new URLSearchParams(cleanParams).toString();
  return apiClient(queryStr ? `/notifications?${queryStr}` : '/notifications', {
    method: 'GET'
  });
}

/**
 * Retrieves total unread notifications count for authenticated candidate.
 *
 * @returns {Promise<any>}
 */
export async function getUnreadCountApi() {
  return apiClient('/notifications/unread-count', {
    method: 'GET'
  });
}

/**
 * Marks a specific notification as read.
 *
 * @param {string} notificationId
 * @returns {Promise<any>}
 */
export async function markAsReadApi(notificationId) {
  return apiClient(`/notifications/${notificationId}/read`, {
    method: 'PUT'
  });
}

/**
 * Marks all unread notifications as read.
 *
 * @returns {Promise<any>}
 */
export async function markAllAsReadApi() {
  return apiClient('/notifications/read-all', {
    method: 'PUT'
  });
}

/**
 * Permanently deletes a single notification.
 *
 * @param {string} notificationId
 * @returns {Promise<any>}
 */
export async function deleteNotificationApi(notificationId) {
  return apiClient(`/notifications/${notificationId}`, {
    method: 'DELETE'
  });
}

/**
 * Clears all notifications or all read notifications.
 *
 * @param {Object} [params={}] - { isRead }
 * @returns {Promise<any>}
 */
export async function clearAllApi(params = {}) {
  const cleanParams = {};
  if (params.isRead !== undefined) cleanParams.isRead = params.isRead;

  const queryStr = new URLSearchParams(cleanParams).toString();
  return apiClient(queryStr ? `/notifications?${queryStr}` : '/notifications', {
    method: 'DELETE'
  });
}
