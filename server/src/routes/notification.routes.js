/**
 * Notification Routes (routes/notification.routes.js)
 * REST endpoints for managing user alerts, unread counters, read state transitions, and deletions.
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  clearNotificationsQuerySchema
} = require('../validators/notification.validator');

// All notification routes strictly require authentication
router.use(requireAuth);

/**
 * @route   GET /api/notifications
 * @desc    Get paginated notifications with filters for authenticated candidate
 * @access  Protected
 */
router.get('/', validate(listNotificationsQuerySchema, 'query'), notificationController.listNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notifications count for authenticated candidate
 * @access  Protected
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Protected
 */
router.put('/:id/read', validate(notificationIdParamSchema, 'params'), notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all unread notifications as read
 * @access  Protected
 */
router.put('/read-all', notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Permanently delete a single notification
 * @access  Protected
 */
router.delete('/:id', validate(notificationIdParamSchema, 'params'), notificationController.deleteNotification);

/**
 * @route   DELETE /api/notifications
 * @desc    Clear all notifications or all read notifications
 * @access  Protected
 */
router.delete('/', validate(clearNotificationsQuerySchema, 'query'), notificationController.clearNotifications);

module.exports = router;
