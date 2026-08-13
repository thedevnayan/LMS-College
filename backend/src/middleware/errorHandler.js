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
  // Only log full stack in development
  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  } else {
    console.error(`[${err.errorCode || 'ERROR'}] ${err.message}`);
  }

  let statusCode = err.statusCode || 500;
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
    message = `Invalid ${err.path}: ${err.value}`;
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

  // Never leak internal error details in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
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
    response.error.fields = fields;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  ApiError,
  errorHandler,
};
