const Test = require('../models/Test');
const Classroom = require('../models/Classroom');
const Course = require('../models/Course');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Helper to check access
 */
const getAccessDetails = async (classroomId, user) => {
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
 * @route   GET /api/classrooms/:classroomId/tests
 * @access  Authenticated
 */
const getTests = asyncHandler(async (req, res, next) => {
  await getAccessDetails(req.params.classroomId, req.user);

  let query = { classroomId: req.params.classroomId };
  
  // Students only see published or active tests
  if (req.user.role === 'student') {
    query.status = { $in: ['published', 'active', 'completed'] };
  }

  const tests = await Test.find(query).sort({ createdAt: -1 }).lean();
  res.status(200).json(successResponse(tests));
});

/**
 * @route   GET /api/tests
 * @access  Professor (All tests)
 */
const getAllTestsForProfessor = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'professor') {
    return next(new ApiError(403, 'FORBIDDEN', 'Only professors can view all tests'));
  }

  const classrooms = await Classroom.find({ professorId: req.user._id }).select('_id');
  const classroomIds = classrooms.map(c => c._id);

  const tests = await Test.find({ classroomId: { $in: classroomIds } })
    .populate({
      path: 'classroomId',
      select: 'courseId classBatch type labBatch',
      populate: { path: 'courseId', select: 'title' }
    })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(successResponse(tests));
});

/**
 * @route   POST /api/classrooms/:classroomId/tests
 * @access  Professor
 */
const createTest = asyncHandler(async (req, res, next) => {
  await getAccessDetails(req.params.classroomId, req.user);

  const { title, description, testType, timeLimit, questions } = req.body;

  const test = await Test.create({
    classroomId: req.params.classroomId,
    title,
    description,
    testType,
    timeLimit,
    questions: questions || []
  });

  res.status(201).json(successResponse(test));
});

/**
 * @route   GET /api/tests/:id
 * @access  Authenticated
 */
const getTestById = asyncHandler(async (req, res, next) => {
  const test = await Test.findById(req.params.id)
    .populate({
      path: 'classroomId',
      select: 'courseId classBatch type labBatch',
      populate: { path: 'courseId', select: 'title' }
    })
    .lean();

  if (!test) return next(new ApiError(404, 'NOT_FOUND', 'Test not found'));

  await getAccessDetails(test.classroomId._id, req.user);

  // If student, maybe strip out correctOptions and testCases depending on state
  if (req.user.role === 'student') {
    test.questions.forEach(q => {
      delete q.correctOptionIndex;
      if (q.testCases) {
        // Strip out hidden test cases
        q.testCases = q.testCases.filter(tc => !tc.isHidden);
      }
    });
  }

  res.status(200).json(successResponse(test));
});

/**
 * @route   PATCH /api/tests/:id
 * @access  Professor
 */
const updateTest = asyncHandler(async (req, res, next) => {
  const test = await Test.findById(req.params.id);
  if (!test) return next(new ApiError(404, 'NOT_FOUND', 'Test not found'));

  await getAccessDetails(test.classroomId, req.user);

  const { title, description, testType, status, timeLimit, questions } = req.body;

  if (title) test.title = title;
  if (description !== undefined) test.description = description;
  if (testType) test.testType = testType;
  if (status) test.status = status;
  if (timeLimit !== undefined) test.timeLimit = timeLimit;
  if (questions) test.questions = questions;

  await test.save();

  res.status(200).json(successResponse(test));
});

/**
 * @route   DELETE /api/tests/:id
 * @access  Professor
 */
const deleteTest = asyncHandler(async (req, res, next) => {
  const test = await Test.findById(req.params.id);
  if (!test) return next(new ApiError(404, 'NOT_FOUND', 'Test not found'));

  await getAccessDetails(test.classroomId, req.user);

  await test.deleteOne();

  res.status(200).json(successResponse({}, 'Test deleted'));
});

module.exports = {
  getTests,
  getAllTestsForProfessor,
  createTest,
  getTestById,
  updateTest,
  deleteTest
};
