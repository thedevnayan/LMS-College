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
  } else if (!isOwner && user.role !== 'admin') {
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
  if (!['professor', 'admin', 'teacher'].includes(req.user.role)) {
    return next(new ApiError(403, 'FORBIDDEN', 'Only faculty and administrators can view tests'));
  }

  const classrooms = req.user.role === 'admin'
    ? await Classroom.find().select('_id')
    : await Classroom.find({ professorId: req.user._id }).select('_id');
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

  const { title, description, testType, status, timeLimit, questions, liveStatus } = req.body;

  const oldStatus = test.status;
  const oldLiveStatus = test.liveStatus;

  if (title) test.title = title;
  if (description !== undefined) test.description = description;
  if (testType) test.testType = testType;
  if (status) test.status = status;
  if (liveStatus) test.liveStatus = liveStatus;
  if (timeLimit !== undefined) test.timeLimit = timeLimit;
  if (questions) test.questions = questions;

  await test.save();

  const { getIo } = require('../sockets/testSocket');

  // If status changed to published or active, notify classroom
  if (status && status !== oldStatus && (status === 'published' || status === 'active')) {
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

  // If liveStatus changed to ended, notify all students in the test room
  if (liveStatus === 'ended' && oldLiveStatus !== 'ended') {
    try {
      getIo().to(test._id.toString()).emit('test_ended', { testId: test._id });
    } catch (err) {
      console.error('Socket error on emitting test_ended:', err);
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

  const students = attempts.map(a => {
    if (a.isGuest) {
      return {
        userId: a.guestId,
        userName: a.guestName,
        score: a.score,
        completed: a.status === 'completed',
        answers: a.answers
      };
    }
    return {
      userId: a.studentId?._id || 'unknown',
      userName: a.studentId?.name || 'Unknown Student',
      score: a.score,
      completed: a.status === 'completed',
      answers: a.answers
    };
  });

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

/**
 * @route   GET /api/tests/:id/report
 * @access  Professor
 * @desc    Fetch aggregated report of all student attempts for a test
 */
const getTestReport = asyncHandler(async (req, res, next) => {
  const TestAttempt = require('../models/TestAttempt');

  const test = await Test.findById(req.params.id)
    .populate('classroomId', 'courseId classBatch type')
    .lean();
  
  if (!test) return next(new ApiError(404, 'NOT_FOUND', 'Test not found'));
  
  await getAccessDetails(test.classroomId._id, req.user);

  const attempts = await TestAttempt.find({ testId: test._id })
    .populate('studentId', 'name email rollNumber')
    .sort({ score: -1 })
    .lean();

  // Normalize guest details for the report
  const normalizedAttempts = attempts.map(a => {
    if (a.isGuest) {
      return {
        ...a,
        studentId: {
          name: a.guestName + ' (Guest)',
          email: 'N/A',
          rollNumber: 'GUEST'
        }
      };
    }
    return a;
  });

  const totalParticipants = normalizedAttempts.length;
  const averageScore = totalParticipants > 0 
    ? (normalizedAttempts.reduce((acc, curr) => acc + curr.score, 0) / totalParticipants).toFixed(2)
    : 0;
  
  const highestScore = totalParticipants > 0 ? normalizedAttempts[0].score : 0;
  const lowestScore = totalParticipants > 0 ? [...normalizedAttempts].sort((a,b) => a.score - b.score)[0].score : 0;

  res.status(200).json(successResponse({
    test,
    stats: {
      totalParticipants,
      averageScore: parseFloat(averageScore),
      highestScore,
      lowestScore
    },
    attempts: normalizedAttempts
  }));
});

/**
 * @route   POST /api/tests/join-guest
 * @access  Public
 * @desc    Join a test as a guest via QR session token
 */
const joinGuestTest = asyncHandler(async (req, res, next) => {
  const { sessionToken, guestName, guestId } = req.body;
  
  if (!sessionToken || !guestName || !guestId) {
    return next(new ApiError(400, 'BAD_REQUEST', 'sessionToken, guestName, and guestId are required'));
  }

  const test = await Test.findOne({ sessionToken }).lean();
  if (!test) return next(new ApiError(404, 'NOT_FOUND', 'Invalid or expired test session'));
  // We allow joining as long as the test exists. Wait for teacher to start it.

  const TestAttempt = require('../models/TestAttempt');
  
  // Find existing attempt or create new one for this guest
  let attempt = await TestAttempt.findOne({ testId: test._id, guestId });
  if (!attempt) {
    attempt = await TestAttempt.create({
      testId: test._id,
      isGuest: true,
      guestId,
      guestName,
      status: 'started',
      score: 0,
      answers: [],
      startedAt: new Date()
    });
  }

  // Strip correct answers
  if (test.questions) {
    test.questions.forEach(q => {
      delete q.correctOptionIndex;
      if (q.testCases) {
        q.testCases = q.testCases.filter(tc => !tc.isHidden);
      }
    });
  }

  res.status(200).json(successResponse({ test, attempt }));
});

/**
 * @route   GET /api/tests/session/:sessionToken/state
 * @access  Public
 * @desc    Get live state for a guest via session token
 */
const getGuestLiveState = asyncHandler(async (req, res, next) => {
  const { sessionToken } = req.params;
  const { guestId } = req.query; // Send guestId in query to get attempt

  const test = await Test.findOne({ sessionToken }).select('currentQuestionIndex turnUserId liveStatus testType timeLimit title questions startTime endTime').lean();
  if (!test) return next(new ApiError(404, 'NOT_FOUND', 'Invalid or expired test session'));

  let attempt = null;
  if (guestId) {
    const TestAttempt = require('../models/TestAttempt');
    attempt = await TestAttempt.findOne({ testId: test._id, guestId }).lean();
  }

  // Strip correct answers
  if (test.questions) {
    test.questions.forEach(q => {
      delete q.correctOptionIndex;
      if (q.testCases) {
        q.testCases = q.testCases.filter(tc => !tc.isHidden);
      }
    });
  }

  res.status(200).json(successResponse({
    attempt,
    liveState: {
      currentQuestionIndex: test.currentQuestionIndex || 0,
      turnUserId: test.turnUserId || null,
      liveStatus: test.liveStatus,
      startTime: test.startTime,
      endTime: test.endTime
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
  getMyAttempt,
  getTestReport,
  joinGuestTest,
  getGuestLiveState
};
