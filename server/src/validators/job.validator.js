/**
 * Job Validation Schemas (validators/job.validator.js)
 * Strict Joi validation for job query parameters and mutation payloads.
 */

const Joi = require('joi');

const createJobSchema = Joi.object({
  title: Joi.string().trim().min(3).max(120).required().messages({
    'string.empty': 'Job title is required',
    'string.min': 'Job title must be at least 3 characters',
    'string.max': 'Job title cannot exceed 120 characters'
  }),
  company: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Company name is required'
  }),
  location: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Job location is required'
  }),
  type: Joi.string()
    .valid('full-time', 'part-time', 'contract', 'internship')
    .default('full-time'),
  experienceLevel: Joi.string()
    .valid('entry', 'mid', 'senior', 'lead')
    .default('mid'),
  description: Joi.string().trim().min(20).max(10000).required().messages({
    'string.empty': 'Job description is required',
    'string.min': 'Job description must be at least 20 characters'
  }),
  requirements: Joi.object({
    skills: Joi.array().items(Joi.string().trim()).min(1).required().messages({
      'array.min': 'At least one required skill must be provided'
    }),
    experience: Joi.string().trim().allow('').default(''),
    education: Joi.string().trim().allow('').default(''),
    certifications: Joi.array().items(Joi.string().trim()).default([])
  }).required(),
  salary: Joi.object({
    min: Joi.number().min(0).allow(null).default(null),
    max: Joi.number().min(0).allow(null).default(null),
    currency: Joi.string().trim().default('INR')
  }).default(() => ({ min: null, max: null, currency: 'INR' })),
  applicationUrl: Joi.string().trim().uri().allow('').default(''),
  source: Joi.string().trim().default('manual'),
  isActive: Joi.boolean().default(true),
  expiresAt: Joi.date().iso().allow(null).default(null)
});

const updateJobSchema = Joi.object({
  title: Joi.string().trim().min(3).max(120),
  company: Joi.string().trim().min(2).max(100),
  location: Joi.string().trim().min(2).max(100),
  type: Joi.string().valid('full-time', 'part-time', 'contract', 'internship'),
  experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'lead'),
  description: Joi.string().trim().min(20).max(10000),
  requirements: Joi.object({
    skills: Joi.array().items(Joi.string().trim()).min(1),
    experience: Joi.string().trim().allow(''),
    education: Joi.string().trim().allow(''),
    certifications: Joi.array().items(Joi.string().trim())
  }),
  salary: Joi.object({
    min: Joi.number().min(0).allow(null),
    max: Joi.number().min(0).allow(null),
    currency: Joi.string().trim()
  }),
  applicationUrl: Joi.string().trim().uri().allow(''),
  source: Joi.string().trim(),
  isActive: Joi.boolean(),
  expiresAt: Joi.date().iso().allow(null)
}).min(1);

const listJobsQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).allow(''),
  experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'lead').allow(''),
  type: Joi.string().valid('full-time', 'part-time', 'contract', 'internship').allow(''),
  location: Joi.string().trim().max(100).allow(''),
  minSalary: Joi.number().min(0),
  maxSalary: Joi.number().min(0),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sort: Joi.string().valid('postedAt', '-postedAt', 'salary', '-salary', 'title', '-title').default('-postedAt')
});

module.exports = {
  createJobSchema,
  updateJobSchema,
  listJobsQuerySchema
};
