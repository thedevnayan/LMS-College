const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');
const { classroomAccess, sameId } = require('../services/access');
const submitAssignment = (req,res,next) => { req.params.id = req.params.assignmentId; return require('./assignmentController').submitAssignment(req,res,next); };
const getSubmissionById = asyncHandler(async (req,res) => {
  const submission = await Submission.findById(req.params.id).populate('assignmentId', 'title maxMarks dueDate classroomId').populate('studentId', 'name email');
  if (!submission?.assignmentId) throw new ApiError(404, 'NOT_FOUND', 'Submission not found');
  if (req.user.role === 'student' && !sameId(submission.studentId, req.user._id)) throw new ApiError(403, 'FORBIDDEN', 'Not your submission');
  await classroomAccess(submission.assignmentId.classroomId, req.user, req.user.role !== 'student');
  res.json(successResponse(submission));
});
const gradeSubmission = asyncHandler(async (req,res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) throw new ApiError(404, 'NOT_FOUND', 'Submission not found');
  const assignment = await Assignment.findById(submission.assignmentId);
  if (!assignment) throw new ApiError(404, 'NOT_FOUND', 'Assignment not found');
  await classroomAccess(assignment.classroomId, req.user, true);
  const { marks, feedback } = req.body;
  if (typeof marks !== 'number' || !Number.isFinite(marks) || marks < 0 || marks > assignment.maxMarks) throw new ApiError(400, 'INVALID_MARKS', 'Marks must be within assignment maximum');
  Object.assign(submission, { marks, feedback, status: 'graded', gradedBy: req.user._id, gradedAt: new Date() });
  await submission.save(); res.json(successResponse(submission));
});
module.exports = { submitAssignment, getSubmissionById, gradeSubmission };
