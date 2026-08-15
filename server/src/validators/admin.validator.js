/**
 * Admin Action Validators (validators/admin.validator.js)
 * Joi validation schemas for admin user queries, role mutations, and subscription plan updates.
 */

const Joi = require('joi');

const listUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(100).allow(''),
  role: Joi.string().valid('user', 'admin').allow(''),
  plan: Joi.string().valid('free', 'premium').allow(''),
  sort: Joi.string()
    .valid('createdAt', '-createdAt', 'name', '-name', 'email', '-email')
    .default('-createdAt')
});

const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid('user', 'admin').required().messages({
    'any.only': 'Role must be either "user" or "admin"',
    'any.required': 'Role is required'
  })
});

const updateUserPlanSchema = Joi.object({
  plan: Joi.string().valid('free', 'premium').required().messages({
    'any.only': 'Plan must be either "free" or "premium"',
    'any.required': 'Plan is required'
  }),
  resumeAnalysesLimit: Joi.number().integer().min(0).optional(),
  resumeAnalysesUsed: Joi.number().integer().min(0).optional()
});

module.exports = {
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserPlanSchema
};
