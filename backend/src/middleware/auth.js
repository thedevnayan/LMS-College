const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('./errorHandler');
const User = require('../models/User');

/**
 * Protect routes - verifies JWT and attaches user to req
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Not authorized, no token provided'));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Not authorized, user not found'));
    }

    if (!user.isActive) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Not authorized, account is deactivated'));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Token expired'));
    }
    return next(new ApiError(401, 'UNAUTHORIZED', 'Not authorized, token failed'));
  }
});

/**
 * Authorize by role
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', `User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route`));
    }
    next();
  };
};

module.exports = { protect, authorize };
