/**
 * Authentication Request Validation Schemas (auth.validator.js)
 * Declarative Joi schemas for registration and login payloads.
 */

const Joi = require('joi');

const signupSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters'
    }),
    email: Joi.string().trim().email().required().messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    }),
    password: Joi.string().min(8).max(128).required().messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long'
    })
  })
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().trim().email().required().messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required'
    })
  })
};

module.exports = {
  signupSchema,
  loginSchema
};
