/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, errorCode, message, fields = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.fields = fields;
  }
}

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  if (err.name === 'MulterError') statusCode = 400;
  let errorCode = err.errorCode || 'SERVER_ERROR';
  let message = err.message || 'Internal Server Error';
  let fields = err.fields;

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    fields = {};
    for (const field in err.errors) {
      fields[field] = err.errors[field].message;
    }

  }
  
  // Handle Mongoose CastError (invalid ObjectId etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = 'Invalid identifier';
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = 'Duplicate key error';
    
    if (err.keyPattern && err.keyPattern.email) {
      errorCode = 'EMAIL_EXISTS';
      message = 'Email already exists';
    }
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Token expired';
  }

  const { databaseUnavailable, diagnostic } = require('../utils/runtimeError');
  if (databaseUnavailable(err)) {
    statusCode = 503;
    errorCode = 'DATABASE_UNAVAILABLE';
    message = 'Database temporarily unavailable. Please try again shortly.';
    res.set('Retry-After', '5');
  }
  console.error(JSON.stringify({ event: 'request_error', code: errorCode, status: statusCode,
    method: req.method, route: req.route?.path || 'unmatched', ...diagnostic(err) }));

  // Never leak internal error details in production
  if (statusCode >= 500 && !(err instanceof ApiError) && errorCode !== 'DATABASE_UNAVAILABLE') {
    message = 'Internal Server Error';
  }

  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
    }
  };

  if (fields && Object.keys(fields).length > 0) {
    response.error.fields = process.env.NODE_ENV === 'production' ? Object.fromEntries(Object.keys(fields).map(k => [k, 'Invalid value'])) : fields;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  ApiError,
  errorHandler,
};
