/**
 * Application Validator (validators/application.validator.js)
 * Joi validation schemas for job application creation, status transitions, and query filtering.
 */

const Joi = require('joi');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createApplicationSchema = Joi.object({
  jobId: Joi.string().pattern(objectIdRegex).required().messages({
    'string.pattern.base': 'jobId must be a valid 24-character hexadecimal MongoDB ObjectId',
    'any.required': 'jobId is required'
  }),
  resumeId: Joi.string().pattern(objectIdRegex).optional().allow(null, '').messages({
    'string.pattern.base': 'resumeId must be a valid 24-character hexadecimal MongoDB ObjectId'
  }),
  notes: Joi.string().max(1000).allow('').default(''),
  interviewDate: Joi.date().iso().optional().allow(null)
});

const updateApplicationSchema = Joi.object({
  status: Joi.string()
    .valid('applied', 'interviewing', 'offered', 'rejected', 'withdrawn')
    .optional(),
  notes: Joi.string().max(1000).allow('').optional(),
  interviewDate: Joi.date().iso().optional().allow(null)
}).min(1).messages({
  'object.min': 'At least one field (status, notes, or interviewDate) must be provided for update'
});

const listApplicationsQuerySchema = Joi.object({
  status: Joi.string()
    .valid('applied', 'interviewing', 'offered', 'rejected', 'withdrawn')
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

module.exports = {
  createApplicationSchema,
  updateApplicationSchema,
  listApplicationsQuerySchema
};
