/**
 * Notification Service Layer (services/notification.service.js)
 * Implements notification persistence in MongoDB, unread counting, status mutations, deletions, and real-time Socket.IO alerts.
 */

const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { emitToUser } = require('../config/socket');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Creates and persists a new notification in MongoDB, then broadcasts it via Socket.IO.
 *
 * @param {Object} params
 * @param {string|import('mongoose').Types.ObjectId} params.userId
 * @param {string} params.type
 * @param {string} params.title
 * @param {string} params.message
 * @param {Object} [params.data={}]
 * @returns {Promise<Document|null>}
 */
const sendNotification = async ({ userId, type, title, message, data = {} }) => {
  try {
    if (!userId || !type || !title || !message) {
      logger.warn('Incomplete parameters provided to sendNotification');
      return null;
    }

    const userObjId = new mongoose.Types.ObjectId(userId);

    // Duplicate Noise Protection: Check if identical notification was created for this user in last 3 seconds
    const threeSecondsAgo = new Date(Date.now() - 3000);
    const existingRecent = await Notification.findOne({
      userId: userObjId,
      type,
      title,
      createdAt: { $gte: threeSecondsAgo }
    }).lean();

    if (existingRecent) {
      logger.debug(`Skipping duplicate consecutive notification for user ${userId}: ${type}`);
      return existingRecent;
    }

    const notification = await Notification.create({
      userId: userObjId,
      type,
      title,
      message,
      data,
      isRead: false,
      createdAt: new Date()
    });

    const notifObj = notification.toObject();

    // 1. Emit real-time new notification event
    emitToUser(userId, 'notification:new', notifObj);

    // 2. Compute updated unread count and emit
    const unreadCount = await Notification.countDocuments({ userId: userObjId, isRead: false });
    emitToUser(userId, 'notification:unread_count', { unreadCount });

    logger.info(`Notification [${type}] created and emitted to user ${userId}: "${title}"`);
    return notification;
  } catch (err) {
    logger.error(`Error sending notification to user ${userId}: ${err.message}`);
    // Non-blocking: return null so callers are never broken
    return null;
  }
};

/**
 * Retrieves paginated notifications for the authenticated user.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {Object} params - { page, limit, isRead, type, sort }
 * @returns {Promise<{ notifications: Array, total: number, page: number, pages: number, unreadCount: number }>}
 */
const getNotifications = async (userId, { page = 1, limit = 10, isRead, type, sort = '-createdAt' } = {}) => {
  const query = { userId: new mongoose.Types.ObjectId(userId) };

  if (isRead !== undefined && isRead !== null && isRead !== '') {
    query.isRead = isRead === true || isRead === 'true';
  }

  if (type) {
    query.type = type;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: query.userId, isRead: false })
  ]);

  return {
    notifications,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    unreadCount
  };
};

/**
 * Retrieves total unread notifications count for a user.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<{ unreadCount: number }>}
 */
const getUnreadCount = async (userId) => {
  const unreadCount = await Notification.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    isRead: false
  });

  return { unreadCount };
};

/**
 * Marks a specific notification as read.
 *
 * @param {string} notificationId
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<Document>}
 */
const markAsRead = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw ApiError.badRequest('Invalid notification identifier format');
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    userId: new mongoose.Types.ObjectId(userId)
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found or access denied');
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();

    // Broadcast updated unread count
    const unreadCount = await Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      isRead: false
    });
    emitToUser(userId, 'notification:unread_count', { unreadCount });
  }

  return notification;
};

/**
 * Marks all unread notifications for a user as read.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<{ modifiedCount: number }>}
 */
const markAllAsRead = async (userId) => {
  const userObjId = new mongoose.Types.ObjectId(userId);

  const result = await Notification.updateMany(
    { userId: userObjId, isRead: false },
    { $set: { isRead: true } }
  );

  // Broadcast 0 unread count
  emitToUser(userId, 'notification:unread_count', { unreadCount: 0 });

  logger.info(`User ${userId} marked ${result.modifiedCount} notifications as read`);
  return { modifiedCount: result.modifiedCount };
};

/**
 * Permanently deletes a single notification owned by user.
 *
 * @param {string} notificationId
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<{ deletedId: string }>}
 */
const deleteNotification = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw ApiError.badRequest('Invalid notification identifier format');
  }

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    userId: new mongoose.Types.ObjectId(userId)
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found or access denied');
  }

  // Update real-time unread count
  const unreadCount = await Notification.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    isRead: false
  });
  emitToUser(userId, 'notification:unread_count', { unreadCount });

  return { deletedId: notificationId };
};

/**
 * Clears all notifications or all read notifications for a user.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {Object} [options={}] - { isRead }
 * @returns {Promise<{ deletedCount: number }>}
 */
const clearNotifications = async (userId, { isRead } = {}) => {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const query = { userId: userObjId };

  if (isRead === true || isRead === 'true') {
    query.isRead = true;
  }

  const result = await Notification.deleteMany(query);

  const unreadCount = await Notification.countDocuments({ userId: userObjId, isRead: false });
  emitToUser(userId, 'notification:unread_count', { unreadCount });

  logger.info(`User ${userId} cleared ${result.deletedCount} notifications`);
  return { deletedCount: result.deletedCount };
};

module.exports = {
  sendNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearNotifications
};
