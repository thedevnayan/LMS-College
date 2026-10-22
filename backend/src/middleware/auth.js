const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('./errorHandler');
const User = require('../models/User');

/**
 * Protect routes - verifies JWT and attaches user to req
 */
const userLimiter = require('express-rate-limit').rateLimit({
  windowMs: 60_000, limit: 300, keyGenerator: req => String(req.user._id), standardHeaders: 'draft-8', legacyHeaders: false,
});
const protect = asyncHandler(async (req, res, next) => {
  const token = /^Bearer ([^ ]+)$/.exec(req.headers.authorization || '')?.[1];
  req.user = await require('../services/tokens').authenticate(token);
  userLimiter(req, res, next);
});

/**
 * Authorize by role
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Not authenticated'));
    }
    const userRole = req.user.role;
    // Normalize aliases: professor and teacher are interchangeable
    const effectiveRoles = [...roles];
    if (effectiveRoles.includes('professor') && !effectiveRoles.includes('teacher')) {
      effectiveRoles.push('teacher');
    }
    if (effectiveRoles.includes('teacher') && !effectiveRoles.includes('professor')) {
      effectiveRoles.push('professor');
    }
    // Admin has superuser access to professor/teacher routes
    if ((effectiveRoles.includes('professor') || effectiveRoles.includes('teacher')) && !effectiveRoles.includes('admin')) {
      effectiveRoles.push('admin');
    }

    if (!effectiveRoles.includes(userRole)) {
      return next(new ApiError(403, 'FORBIDDEN', `User role ${userRole} is not authorized to access this route`));
    }
    next();
  };
};

module.exports = { protect, authorize };
