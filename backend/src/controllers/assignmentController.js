const Assignment = require('../models/Assignment');
const Module = require('../models/Module');
const Course = require('../models/Course');
const Submission = require('../models/Submission');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Helper to get module and course and verify access
 */
const getAccessDetails = async (moduleId, user) => {
  const moduleObj = await Module.findById(moduleId);
  if (!moduleObj) throw new ApiError(404, 'NOT_FOUND', 'Module not found');

  const course = await Course.findById(moduleObj.courseId);
  if (!course) throw new ApiError(404, 'NOT_FOUND', 'Course not found');

  const isOwner = course.professorId.toString() === user._id.toString();

  if (user.role === 'student') {
    const Enrollment = require('../models/Enrollment');
    const enrollment = await Enrollment.findOne({ courseId: course._id, studentId: user._id });
    if (!enrollment) {
      throw new ApiError(403, 'FORBIDDEN', 'Not enrolled in this course');
    }
  } else if (!isOwner) {
    throw new ApiError(403, 'FORBIDDEN', 'Not authorized');
  }

  return { moduleObj, course, isOwner };
};

/**
 * @route   GET /api/modules/:moduleId/assignments
 * @access  Authenticated (Professor own, or Student enrolled)
 */
const getAssignments = asyncHandler(async (req, res, next) => {
  await getAccessDetails(req.params.moduleId, req.user);

  let assignments = await Assignment.find({ moduleId: req.params.moduleId }).lean();

  if (req.user.role === 'student') {
    const assignmentIds = assignments.map((a) => a._id);
    const submissions = await Submission.find({
      studentId: req.user._id,
      assignmentId: { $in: assignmentIds }
    }).lean();

    const submissionMap = {};
    submissions.forEach(sub => {
      submissionMap[sub.assignmentId] = sub;
    });

    assignments = assignments.map(a => ({
      ...a,
      submissionStatus: submissionMap[a._id] ? submissionMap[a._id].status : 'unsubmitted',
      score: submissionMap[a._id] ? submissionMap[a._id].marks : null,
    }));
  }

  res.status(200).json(successResponse(assignments));
});

/**
 * @route   POST /api/modules/:moduleId/assignments
 * @access  Professor (Owner only)
 */
const createAssignment = asyncHandler(async (req, res, next) => {
  await getAccessDetails(req.params.moduleId, req.user);

  const { title, description, dueDate, maxMarks, attachments } = req.body;

  const assignment = await Assignment.create({
    moduleId: req.params.moduleId,
    title,
    description,
    dueDate,
    maxMarks,
    attachments: attachments || [],
  });

  res.status(201).json(successResponse(assignment));
});

/**
 * @route   GET /api/assignments/:id
 * @access  Authenticated (Professor own, or Student enrolled)
 */
const getAssignmentById = asyncHandler(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.id).lean();
  if (!assignment) return next(new ApiError(404, 'NOT_FOUND', 'Assignment not found'));

  await getAccessDetails(assignment.moduleId, req.user);

  if (req.user.role === 'student') {
    const submission = await Submission.findOne({
      studentId: req.user._id,
      assignmentId: assignment._id,
    }).lean();

    assignment.submission = submission || null;
  }

  res.status(200).json(successResponse(assignment));
});

/**
 * @route   PATCH /api/assignments/:id
 * @access  Professor (Owner only)
 */
const updateAssignment = asyncHandler(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return next(new ApiError(404, 'NOT_FOUND', 'Assignment not found'));

  await getAccessDetails(assignment.moduleId, req.user);

  const { title, description, dueDate, maxMarks, attachments } = req.body;

  if (title) assignment.title = title;
  if (description !== undefined) assignment.description = description;
  if (dueDate) assignment.dueDate = dueDate;
  if (maxMarks) assignment.maxMarks = maxMarks;
  if (attachments) assignment.attachments = attachments;

  await assignment.save();

  res.status(200).json(successResponse(assignment));
});

/**
 * @route   DELETE /api/assignments/:id
 * @access  Professor (Owner only)
 */
const deleteAssignment = asyncHandler(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return next(new ApiError(404, 'NOT_FOUND', 'Assignment not found'));

  await getAccessDetails(assignment.moduleId, req.user);

  assignment.deletedAt = new Date();
  await assignment.save(); // cascades to submissions

  res.status(200).json(successResponse({}, 'Assignment deleted'));
});

/**
 * @route   GET /api/assignments/:id/submissions
 * @access  Professor (Owner only)
 */
const getAssignmentSubmissions = asyncHandler(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return next(new ApiError(404, 'NOT_FOUND', 'Assignment not found'));

  await getAccessDetails(assignment.moduleId, req.user);

  const submissions = await Submission.find({ assignmentId: assignment._id })
    .populate('studentId', 'name email avatarUrl');

  res.status(200).json(successResponse(submissions));
});

module.exports = {
  getAssignments,
  createAssignment,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
};
