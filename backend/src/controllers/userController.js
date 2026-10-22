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
  let isProfessor = req.user.role === 'admin';
  if (['professor','teacher'].includes(req.user.role) && user.role === 'student') {
    const classes = await require('../models/Classroom').find({professorId:req.user._id}).select('_id');
    isProfessor = Boolean(await require('../models/Enrollment').exists({studentId:user._id,classroomId:{$in:classes.map(c=>c._id)}}));
  }

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
    returnDocument: 'after',
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
    enrollmentApproved: role === 'student',
  });

  res.status(201).json(successResponse(user, 'User created successfully'));
});

module.exports = {
  getUserById,
  updateUser,
  createUser,
  approveEnrollment: asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Administrator required');
    if (req.body.confirmed !== true) throw new ApiError(400, 'CONFIRMATION_REQUIRED', 'Confirm that student identity has been checked');
    const user = await require('mongoose').connection.transaction(async session => {
      const approved = await User.findOneAndUpdate({ _id: req.params.id, role: 'student' }, { enrollmentApproved: true }, { returnDocument: 'after', session });
      if (!approved) throw new ApiError(404, 'NOT_FOUND', 'Student not found');
      await require('../models/AuditLog').create([{ actorId: req.user._id, actorName: req.user.name, actorRole: req.user.role, action: 'STUDENT_IDENTITY_APPROVED', entity: 'User', entityId: String(approved._id) }], { session });
      return approved;
    });
    res.json(successResponse(user, 'Student identity approved for assigned invitations'));
  }),
};
