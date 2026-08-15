/**
 * Saved Job Validator (validators/savedJob.validator.js)
 * Joi validation schemas for bookmarking jobs and query filtering.
 */

const Joi = require('joi');

const saveJobSchema = Joi.object({
  notes: Joi.string().max(500).allow('').default('')
});

const listSavedJobsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

module.exports = {
  saveJobSchema,
  listSavedJobsQuerySchema
};
