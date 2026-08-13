/**
 * Async handler to wrap express routes and pass errors to the error handling middleware
 * @param {Function} fn - The async express route handler
 * @returns {Function}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
