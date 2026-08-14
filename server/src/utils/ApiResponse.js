/**
 * Standardized API Response Helper (ApiResponse.js)
 * Guarantees a 100% consistent JSON response envelope across all successful endpoints.
 */

class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code (200, 201, etc.)
   * @param {any} [data=null] - Payload returned to client
   * @param {string} [message='Success'] - Human-readable success message
   */
  constructor(statusCode = 200, data = null, message = 'Success') {
    this.success = true;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Sends the structured response through Express response object.
   * @param {import('express').Response} res - Express response
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp
    });
  }

  static success(res, data = null, message = 'Success', statusCode = 200) {
    return new ApiResponse(statusCode, data, message).send(res);
  }

  static created(res, data = null, message = 'Resource created successfully') {
    return new ApiResponse(201, data, message).send(res);
  }
}

module.exports = ApiResponse;
