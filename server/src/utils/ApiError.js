/**
 * Custom Operational API Error Class (ApiError.js)
 * Standardizes application-level error throwing with HTTP status codes and error identifiers.
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 403, 404, 500)
   * @param {string} message - Human-readable error message
   * @param {string} [code='INTERNAL_ERROR'] - Machine-readable error code
   * @param {Array|Object|null} [details=null] - Additional validation or contextual details
   */
  constructor(statusCode, message, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Flags this as a known, trusted operational error

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details = null) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized access', details = null) {
    return new ApiError(401, message, 'UNAUTHORIZED', details);
  }

  static forbidden(message = 'Forbidden access', details = null) {
    return new ApiError(403, message, 'FORBIDDEN', details);
  }

  static notFound(message = 'Resource not found', details = null) {
    return new ApiError(404, message, 'NOT_FOUND', details);
  }

  static conflict(message = 'Resource conflict', details = null) {
    return new ApiError(409, message, 'CONFLICT', details);
  }

  static tooManyRequests(message = 'Too many requests, please try again later', details = null) {
    return new ApiError(429, message, 'TOO_MANY_REQUESTS', details);
  }

  static notImplemented(message = 'Feature not implemented yet', details = null) {
    return new ApiError(501, message, 'NOT_IMPLEMENTED', details);
  }

  static internal(message = 'Internal server error', details = null) {
    return new ApiError(500, message, 'INTERNAL_ERROR', details);
  }
}

module.exports = ApiError;
