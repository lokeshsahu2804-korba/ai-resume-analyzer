/**
 * Request Schema Validation Middleware (validate.middleware.js)
 * Validates request body, query, and params against Joi schemas and sanitizes input.
 */

const ApiError = require('../utils/ApiError');

/**
 * Creates an Express validation middleware for a given Joi schema.
 *
 * @param {Object} schema - Object containing Joi schemas: { body?, query?, params? }
 * @returns {Function} Express middleware function
 */
const validate = (schema) => (req, res, next) => {
  const validSchema = ['body', 'query', 'params'];
  const errors = [];

  for (const key of validSchema) {
    if (schema[key]) {
      const { value, error } = schema[key].validate(req[key], {
        abortEarly: false, // Return all validation errors, not just the first
        stripUnknown: true, // Strip unexpected fields from input
        allowUnknown: false
      });

      if (error) {
        const details = error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message.replace(/['"]/g, '')
        }));
        errors.push(...details);
      } else {
        // Assign the sanitized/cast value back to req[key]
        req[key] = value;
      }
    }
  }

  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation failed on input parameters', 'VALIDATION_ERROR', errors));
  }

  return next();
};

module.exports = validate;
