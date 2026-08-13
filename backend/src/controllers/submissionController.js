const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Module = require('../models/Module');
const Course = require('../models/Course');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @route   POST /api/assignments/:assignmentId/submissions
 * @access  Student (Enrolled only)
 */
const submitAssignment = asyncHandler(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) return next(new ApiError(404, 'NOT_FOUND', 'Assignment not found'));

  const moduleObj = await Module.findById(assignment.moduleId);
  
  // Verify student is enrolled
  const Enrollment = require('../models/Enrollment');
  const enrollment = await Enrollment.findOne({ courseId: moduleObj.courseId, studentId: req.user._id });
  if (!enrollment) return next(new ApiError(403, 'FORBIDDEN', 'Not enrolled in this course'));

  const { fileUrl, comment } = req.body;

  // Check if existing submission is graded (Edge Case: Resubmission rule)
  const existingSubmission = await Submission.findOne({
    assignmentId: assignment._id,
    studentId: req.user._id,
  });

  if (existingSubmission && existingSubmission.status === 'graded') {
    return next(new ApiError(409, 'SUBMISSION_LOCKED', 'Cannot resubmit after being graded'));
  }

  const isLate = Date.now() > new Date(assignment.dueDate).getTime();

  // Upsert the submission (allows resubmitting before grading)
  const submission = await Submission.findOneAndUpdate(
    { assignmentId: assignment._id, studentId: req.user._id },
    {
      assignmentId: assignment._id,
      studentId: req.user._id,
      fileUrl,
      comment,
      isLate,
      submittedAt: Date.now(),
    },
    { upsert: true, new: true, runValidators: true }
  );

  res.status(200).json(successResponse(submission));
});

/**
 * @route   GET /api/submissions/:id
 * @access  Authenticated (Student own, or Professor of the course)
 */
const getSubmissionById = asyncHandler(async (req, res, next) => {
  const submission = await Submission.findById(req.params.id)
    .populate('assignmentId', 'title maxMarks dueDate')
    .populate('studentId', 'name email avatarUrl');

  if (!submission) return next(new ApiError(404, 'NOT_FOUND', 'Submission not found'));

  // Auth check
  if (req.user.role === 'student' && submission.studentId._id.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized to view this submission'));
  } else if (req.user.role === 'professor') {
    const assignment = await Assignment.findById(submission.assignmentId._id);
    const moduleObj = await Module.findById(assignment.moduleId);
    const course = await Course.findById(moduleObj.courseId);
    if (course.professorId.toString() !== req.user._id.toString()) {
      return next(new ApiError(403, 'FORBIDDEN', 'Not authorized'));
    }
  }

  res.status(200).json(successResponse(submission));
});

/**
 * @route   PATCH /api/submissions/:id/grade
 * @access  Professor (Owner only)
 */
const gradeSubmission = asyncHandler(async (req, res, next) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) return next(new ApiError(404, 'NOT_FOUND', 'Submission not found'));

  const assignment = await Assignment.findById(submission.assignmentId);
  const moduleObj = await Module.findById(assignment.moduleId);
  const course = await Course.findById(moduleObj.courseId);

  if (course.professorId.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized'));
  }

  const { marks, feedback } = req.body;

  // Validate marks
  if (marks < 0 || marks > assignment.maxMarks) {
    return next(new ApiError(400, 'VALIDATION_ERROR', `Marks must be between 0 and ${assignment.maxMarks}`));
  }

  submission.marks = marks;
  if (feedback !== undefined) submission.feedback = feedback;
  submission.status = 'graded';
  submission.gradedBy = req.user._id;
  submission.gradedAt = new Date();

  await submission.save();

  res.status(200).json(successResponse(submission));
});

module.exports = {
  submitAssignment,
  getSubmissionById,
  gradeSubmission,
};
