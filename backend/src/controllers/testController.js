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
  let tests = await Test.find(query).sort({ createdAt: -1 }).lean();

  if (req.user.role === 'student') {
    const TestAttempt = require('../models/TestAttempt');
    const testIds = tests.map(t => t._id);
    const attempts = await TestAttempt.find({
      studentId: req.user._id,
      testId: { $in: testIds }
    }).lean();

    const attemptMap = {};
    attempts.forEach(a => {
      attemptMap[a.testId] = a.status;
    });

    tests = tests.map(t => ({
      ...t,
      attemptStatus: attemptMap[t._id] || 'unattempted'
    }));
  }

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

  const oldStatus = test.status;

  if (title) test.title = title;
  if (description !== undefined) test.description = description;
  if (testType) test.testType = testType;
  if (status) test.status = status;
  if (timeLimit !== undefined) test.timeLimit = timeLimit;
  if (questions) test.questions = questions;

  await test.save();

  // If status changed to published or active, notify classroom
  if (status && status !== oldStatus && (status === 'published' || status === 'active')) {
    const { getIo } = require('../sockets/testSocket');
    try {
      getIo().to(`classroom_${test.classroomId}`).emit('test_hosted', {
        testId: test._id,
        title: test.title,
        classroomId: test.classroomId,
        message: `A new test "${test.title}" is now available!`
      });
    } catch (err) {
      console.error('Socket error on updateTest:', err);
    }
  }

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

/**
 * @route   PATCH /api/tests/:id/join-code
 * @access  Professor
 */
const generateJoinCode = asyncHandler(async (req, res, next) => {
  const test = await Test.findById(req.params.id);
  if (!test) return next(new ApiError(404, 'NOT_FOUND', 'Test not found'));

  await getAccessDetails(test.classroomId, req.user);

  // Generate a random 6-character code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  test.joinCode = code;
  test.liveStatus = 'in-progress';
  await test.save();

  const { getIo } = require('../sockets/testSocket');
  try {
    getIo().to(`classroom_${test.classroomId}`).emit('test_hosted', {
      testId: test._id,
      title: test.title,
      classroomId: test.classroomId,
      joinCode: code,
      message: `Live Test "${test.title}" is starting! Join Code: ${code}`
    });
  } catch (err) {
    console.error('Socket error on generateJoinCode:', err);
  }

  res.status(200).json(successResponse({ joinCode: code }));
});

/**
 * @route   GET /api/tests/join/:code
 * @access  Authenticated
 */
const verifyJoinCode = asyncHandler(async (req, res, next) => {
  const code = req.params.code.toUpperCase();
  const test = await Test.findOne({ joinCode: code }).populate({
    path: 'classroomId',
    select: 'courseId title classBatch'
  });

  if (!test) return next(new ApiError(404, 'NOT_FOUND', 'Invalid join code'));

  // Ensure user has access (if student, they must be enrolled)
  await getAccessDetails(test.classroomId._id, req.user);

  res.status(200).json(successResponse({ testId: test._id, title: test.title, liveStatus: test.liveStatus }));
});

/**
 * @route   GET /api/tests/:id/live-state
 * @access  Professor
 * @desc    Fetch full live test state for teacher dashboard reconnection
 */
const getLiveState = asyncHandler(async (req, res, next) => {
  const TestAttempt = require('../models/TestAttempt');

  const test = await Test.findById(req.params.id).lean();
  if (!test) return next(new ApiError(404, 'NOT_FOUND', 'Test not found'));

  // Fetch all attempts for this test (the "participants" list)
  const attempts = await TestAttempt.find({ testId: test._id })
    .populate('studentId', 'name email')
    .lean();

  const students = attempts.map(a => ({
    userId: a.studentId._id,
    userName: a.studentId.name,
    score: a.score,
    completed: a.status === 'completed',
    answers: a.answers
  }));

  res.status(200).json(successResponse({
    test,
    currentQuestionIndex: test.currentQuestionIndex || 0,
    turnUserId: test.turnUserId || null,
    liveStatus: test.liveStatus,
    students
  }));
});

/**
 * @route   GET /api/tests/:id/my-attempt
 * @access  Student
 * @desc    Fetch the student's own attempt for reconnection / state restore
 */
const getMyAttempt = asyncHandler(async (req, res, next) => {
  const TestAttempt = require('../models/TestAttempt');

  const attempt = await TestAttempt.findOne({
    testId: req.params.id,
    studentId: req.user._id
  }).lean();

  const test = await Test.findById(req.params.id).select('currentQuestionIndex turnUserId liveStatus testType timeLimit title questions').lean();
  if (!test) return next(new ApiError(404, 'NOT_FOUND', 'Test not found'));

  // Strip correct answers for student
  if (test.questions) {
    test.questions.forEach(q => {
      delete q.correctOptionIndex;
      if (q.testCases) {
        q.testCases = q.testCases.filter(tc => !tc.isHidden);
      }
    });
  }

  res.status(200).json(successResponse({
    attempt: attempt || null,
    liveState: {
      currentQuestionIndex: test.currentQuestionIndex || 0,
      turnUserId: test.turnUserId || null,
      liveStatus: test.liveStatus,
    },
    test
  }));
});

module.exports = {
  getTests,
  getAllTestsForProfessor,
  createTest,
  getTestById,
  updateTest,
  deleteTest,
  generateJoinCode,
  verifyJoinCode,
  getLiveState,
  getMyAttempt
};
