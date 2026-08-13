/**
 * Helper to paginate Mongoose queries
 * @param {Model} model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} reqQuery - The req.query object containing page, limit, and sort options
 * @param {Object} options - Additional options like populate
 * @returns {Promise<Object>} { data, meta }
 */
const paginate = async (model, filter = {}, reqQuery = {}, options = {}) => {
  const page = parseInt(reqQuery.page, 10) || 1;
  const limit = parseInt(reqQuery.limit, 10) || 20;
  
  // Enforce max limit of 100
  const finalLimit = limit > 100 ? 100 : limit;
  const skip = (page - 1) * finalLimit;

  let query = model.find(filter);

  // Sorting
  if (reqQuery.sort) {
    const sortBy = reqQuery.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else if (options.defaultSort) {
    query = query.sort(options.defaultSort);
  } else {
    query = query.sort('-createdAt'); // Default sort
  }

  // Populating
  if (options.populate) {
    query = query.populate(options.populate);
  }

  query = query.skip(skip).limit(finalLimit);

  // Execute query and count simultaneously
  const [data, total] = await Promise.all([
    query.exec(),
    model.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / finalLimit);

  const meta = {
    page,
    limit: finalLimit,
    total,
    totalPages,
  };

  return { data, meta };
};

module.exports = paginate;
