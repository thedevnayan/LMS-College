const Assignment = require('../models/Assignment');
const Module = require('../models/Module');
const Course = require('../models/Course');
const Submission = require('../models/Submission');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Helper to get classroom and course and verify access
 */
const getAccessDetails = async (classroomId, user) => {
  const Classroom = require('../models/Classroom');
  const classroom = await Classroom.findById(classroomId).populate('courseId');
  if (!classroom) throw new ApiError(404, 'NOT_FOUND', 'Classroom not found');

  const course = classroom.courseId;
  const isOwner = classroom.professorId.toString() === user._id.toString();

  if (user.role === 'student') {
    const Enrollment = require('../models/Enrollment');
    const enrollment = await Enrollment.findOne({ courseId: course._id, studentId: user._id });
    if (!enrollment) {
      throw new ApiError(403, 'FORBIDDEN', 'Not enrolled in this course');
    }
  } else if (!isOwner) {
    throw new ApiError(403, 'FORBIDDEN', 'Not authorized');
  }

  return { classroom, course, isOwner };
};

/**
 * @route   GET /api/classrooms/:classroomId/assignments
 * @access  Authenticated (Professor own, or Student enrolled)
 */
const getAssignments = asyncHandler(async (req, res, next) => {
  await getAccessDetails(req.params.classroomId, req.user);

  let assignments = await Assignment.find({ classroomId: req.params.classroomId }).lean();

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
 * @route   GET /api/assignments
 * @access  Professor (Owner only)
 */
const getAllAssignmentsForProfessor = asyncHandler(async (req, res, next) => {
  const Classroom = require('../models/Classroom');
  
  // Find all classrooms owned by the professor
  const classrooms = await Classroom.find({ professorId: req.user._id }).populate('courseId', 'title').lean();
  const classroomIds = classrooms.map(c => c._id);

  // Find all assignments for these classrooms
  const assignments = await Assignment.find({ classroomId: { $in: classroomIds } }).lean();

  const classroomMap = {};
  classrooms.forEach(c => classroomMap[c._id] = c);

  const enrichedAssignments = assignments.map(a => {
    const cls = classroomMap[a.classroomId] || {};
    const batchStr = cls.type === 'lab' && cls.labBatch 
      ? `Batch ${cls.classBatch} (${cls.labBatch}) - Lab` 
      : `Batch ${cls.classBatch} - Theory`;

    return {
      ...a,
      courseTitle: cls.courseId?.title || 'Unknown Course',
      batchName: batchStr,
    };
  });

  res.status(200).json(successResponse(enrichedAssignments));
});

/**
 * @route   POST /api/classrooms/:classroomId/assignments
 * @access  Professor (Owner only)
 */
const createAssignment = asyncHandler(async (req, res, next) => {
  await getAccessDetails(req.params.classroomId, req.user);

  const { title, description, startDate, dueDate, maxMarks, attachments, questions } = req.body;

  const assignment = await Assignment.create({
    classroomId: req.params.classroomId,
    title,
    description,
    startDate,
    dueDate,
    maxMarks,
    attachments: attachments || [],
    questions: questions || [],
  });

  res.status(201).json(successResponse(assignment));
});

/**
 * @route   GET /api/assignments/:id
 * @access  Authenticated (Professor own, or Student enrolled)
 */
const getAssignmentById = asyncHandler(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.id)
    .populate({
      path: 'classroomId',
      select: 'courseId classBatch type labBatch',
      populate: { path: 'courseId', select: 'title' }
    })
    .lean();
  if (!assignment) return next(new ApiError(404, 'NOT_FOUND', 'Assignment not found'));

  await getAccessDetails(assignment.classroomId, req.user);

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

  await getAccessDetails(assignment.classroomId, req.user);

  const { title, description, startDate, dueDate, maxMarks, attachments, questions } = req.body;

  if (title) assignment.title = title;
  if (description !== undefined) assignment.description = description;
  if (startDate) assignment.startDate = startDate;
  if (dueDate) assignment.dueDate = dueDate;
  if (maxMarks) assignment.maxMarks = maxMarks;
  if (attachments) assignment.attachments = attachments;
  if (questions) assignment.questions = questions;

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

  await getAccessDetails(assignment.classroomId, req.user);

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

  await getAccessDetails(assignment.classroomId, req.user);

  const submissions = await Submission.find({ assignmentId: assignment._id })
    .populate('studentId', 'name email avatarUrl');

  res.status(200).json(successResponse(submissions));
});

module.exports = {
  getAssignments,
  getAllAssignmentsForProfessor,
  createAssignment,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
};
