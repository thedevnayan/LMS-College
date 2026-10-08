const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @route   GET /api/users/:id
 * @access  Authenticated (Self, or professor viewing student in course)
 */
const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ApiError(404, 'NOT_FOUND', 'User not found'));
  }

  // Ownership / Permission check
  // Self is allowed
  const isSelf = req.user._id.toString() === req.params.id;
  // Professor viewing student in course - MVP assumes professors can view any student profile if they know the ID, 
  // or we enforce it strictly. For MVP spec: "self, or professor viewing a student in their course".
  // Since we haven't built courses yet, we'll allow professors for now and refine later, or strictly require isSelf.
  const isProfessor = req.user.role === 'professor';

  if (!isSelf && !isProfessor) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized to view this user'));
  }

  res.status(200).json(successResponse(user));
});

/**
 * @route   PATCH /api/users/:id
 * @access  Authenticated (Self only)
 */
const updateUser = asyncHandler(async (req, res, next) => {
  if (req.user._id.toString() !== req.params.id) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized to update this user'));
  }

  // Only allow updating name and avatarUrl (preventing role/email escalation)
  const updates = {};
  if (req.body.name) updates.name = req.body.name;
  if (req.body.avatarUrl) updates.avatarUrl = req.body.avatarUrl;

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new ApiError(404, 'NOT_FOUND', 'User not found'));
  }

  res.status(200).json(successResponse(user));
});

/**
 * @route   POST /api/users
 * @access  Admin only
 */
const createUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (req.user.role !== 'admin') {
    return next(new ApiError(403, 'FORBIDDEN', 'Only admins can create users directly'));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ApiError(409, 'CONFLICT', 'User with this email already exists'));
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'teacher',
  });

  res.status(201).json(successResponse(user, 'User created successfully'));
});

module.exports = {
  getUserById,
  updateUser,
  createUser,
};
