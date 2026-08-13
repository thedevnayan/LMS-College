/**
 * Standard success response envelope
 * @param {Object} data - The response payload
 * @param {String} message - Optional human-readable message
 * @returns {Object}
 */
const successResponse = (data = {}, message = undefined) => {
  const response = {
    success: true,
    data,
  };
  if (message) {
    response.message = message;
  }
  return response;
};

/**
 * Standard paginated response envelope
 * @param {Array} data - The array of items for the current page
 * @param {Object} meta - Pagination metadata { page, limit, total, totalPages }
 * @returns {Object}
 */
const paginatedResponse = (data = [], meta) => {
  return {
    success: true,
    data,
    meta,
  };
};

module.exports = {
  successResponse,
  paginatedResponse,
};
