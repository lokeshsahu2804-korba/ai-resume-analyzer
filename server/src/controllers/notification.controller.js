/**
 * Notification Controller (controllers/notification.controller.js)
 * HTTP route handlers for notification listings, unread badges, status updates, and deletions.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const notificationService = require('../services/notification.service');

/**
 * GET /api/notifications
 * Retrieves paginated notifications with filters for authenticated user.
 */
const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getNotifications(req.user._id, req.query);
  return ApiResponse.success(res, result, 'Notifications retrieved successfully', 200);
});

/**
 * GET /api/notifications/unread-count
 * Retrieves total unread notifications count for authenticated user.
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user._id);
  return ApiResponse.success(res, result, 'Unread notification count retrieved', 200);
});

/**
 * PUT /api/notifications/:id/read
 * Marks a specific notification as read.
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await notificationService.markAsRead(id, req.user._id);
  return ApiResponse.success(res, { notification }, 'Notification marked as read', 200);
});

/**
 * PUT /api/notifications/read-all
 * Marks all unread notifications for authenticated user as read.
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user._id);
  return ApiResponse.success(res, result, 'All notifications marked as read', 200);
});

/**
 * DELETE /api/notifications/:id
 * Permanently deletes a single notification owned by authenticated user.
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await notificationService.deleteNotification(id, req.user._id);
  return ApiResponse.success(res, result, 'Notification deleted successfully', 200);
});

/**
 * DELETE /api/notifications
 * Clears all notifications or all read notifications for authenticated user.
 */
const clearNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.clearNotifications(req.user._id, req.query);
  return ApiResponse.success(res, result, 'Notifications cleared successfully', 200);
});

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearNotifications
};
