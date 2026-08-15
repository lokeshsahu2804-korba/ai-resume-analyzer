/**
 * Notification Validators (validators/notification.validator.js)
 * Joi schemas for listing notifications, parameter ID validation, and bulk clear operations.
 */

const Joi = require('joi');
const Notification = require('../models/Notification');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const listNotificationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  isRead: Joi.boolean().optional(),
  type: Joi.string()
    .valid(...Notification.TYPES)
    .allow('')
    .optional(),
  sort: Joi.string().valid('createdAt', '-createdAt').default('-createdAt')
});

const notificationIdParamSchema = Joi.object({
  id: Joi.string().regex(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid notification identifier format. Must be a 24-character hexadecimal ObjectId.',
    'any.required': 'Notification ID is required'
  })
});

const clearNotificationsQuerySchema = Joi.object({
  isRead: Joi.boolean().optional()
});

module.exports = {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
  clearNotificationsQuerySchema
};
