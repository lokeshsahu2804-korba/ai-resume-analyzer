/**
 * Request Schema Validation Middleware (validate.middleware.js)
 * Validates request body, query, and params against Joi schemas and sanitizes input.
 */

const ApiError = require('../utils/ApiError');

/**
 * Creates an Express validation middleware for a given Joi schema.
 *
 * @param {Object} schema - Joi schema or object containing { body?, query?, params? }
 * @param {string} [source='body'] - Fallback source if direct Joi schema is passed ('body' | 'query' | 'params')
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const validSources = ['body', 'query', 'params'];
  const hasStructuredKey = schema && typeof schema === 'object' && validSources.some((k) => schema[k]);

  if (hasStructuredKey) {
    const errors = [];
    for (const key of validSources) {
      if (schema[key]) {
        const { value, error } = schema[key].validate(req[key], {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });

        if (error) {
          const details = error.details.map((d) => ({
            field: d.path.join('.'),
            message: d.message.replace(/['"]/g, '')
          }));
          errors.push(...details);
        } else {
          req[key] = value;
        }
      }
    }

    if (errors.length > 0) {
      return next(new ApiError(400, 'Validation failed on input parameters', 'VALIDATION_ERROR', errors));
    }
    return next();
  }

  // Direct Joi Schema handling
  if (schema && typeof schema.validate === 'function') {
    const targetSource = source || 'body';
    const { value, error } = schema.validate(req[targetSource], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, '')
      }));
      return next(new ApiError(400, 'Validation failed on input parameters', 'VALIDATION_ERROR', details));
    }

    req[targetSource] = value;
    return next();
  }

  return next();
};

module.exports = validate;
