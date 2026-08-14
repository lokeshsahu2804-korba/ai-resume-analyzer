/**
 * Asynchronous Route Wrapper Utility (asyncHandler.js)
 * Wraps async Express route controllers to catch unhandled Promise rejections and pass them to next().
 *
 * @param {Function} fn - Async controller function (req, res, next) => Promise<any>
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
