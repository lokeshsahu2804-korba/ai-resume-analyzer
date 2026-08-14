/**
 * User Request Validation Schemas (validators/user.validator.js)
 * Declarative Joi schemas for profile updates and password changes.
 */

const Joi = require('joi');

const updateProfileSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters'
    }),
    phone: Joi.string().trim().allow(''),
    location: Joi.string().trim().allow(''),
    linkedin: Joi.string().trim().allow(''),
    github: Joi.string().trim().allow(''),
    portfolio: Joi.string().trim().allow(''),
    bio: Joi.string().trim().max(1000).allow('').messages({
      'string.max': 'Bio cannot exceed 1000 characters'
    })
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update profile'
  })
};

const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required().messages({
      'string.empty': 'Current password is required'
    }),
    newPassword: Joi.string().min(8).max(128).required().messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 8 characters long'
    })
  })
};

module.exports = {
  updateProfileSchema,
  changePasswordSchema
};
