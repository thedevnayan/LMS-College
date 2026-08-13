const Quiz = require('../models/Quiz');
const Module = require('../models/Module');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const QuizAttempt = require('../models/QuizAttempt');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Helper to check course ownership and enrollment
 */
const getAccessDetails = async (moduleId, user) => {
  const moduleObj = await Module.findById(moduleId);
  if (!moduleObj) throw new ApiError(404, 'NOT_FOUND', 'Module not found');

  const course = await Course.findById(moduleObj.courseId);
  if (!course) throw new ApiError(404, 'NOT_FOUND', 'Course not found');

  const isOwner = course.professorId.toString() === user._id.toString();
  let enrollment = null;

  if (user.role === 'student') {
    enrollment = await Enrollment.findOne({ courseId: course._id, studentId: user._id });
    if (!enrollment) {
      throw new ApiError(403, 'FORBIDDEN', 'Not enrolled in this course');
    }
  } else if (!isOwner) {
    throw new ApiError(403, 'FORBIDDEN', 'Not authorized');
  }

  return { moduleObj, course, isOwner, enrollment };
};

/**
 * @route   GET /api/modules/:moduleId/quizzes
 * @access  Authenticated
 */
const getQuizzes = asyncHandler(async (req, res, next) => {
  const { isOwner, enrollment } = await getAccessDetails(req.params.moduleId, req.user);

  let filter = { moduleId: req.params.moduleId };

  if (req.user.role === 'student') {
    filter.published = true;
  }

  let quizzes = await Quiz.find(filter).lean();

  if (req.user.role === 'student') {
    // Filter out quizzes meant for other batches
    quizzes = quizzes.filter(q => {
      if (q.batchIds && q.batchIds.length > 0) {
        if (!enrollment.batchId) return false;
        // Check if student's batch is in the quiz's targeted batches
        return q.batchIds.some(bid => bid.toString() === enrollment.batchId.toString());
      }
      return true; // No batch targeting = visible to all
    });

    // Strip answers
    quizzes.forEach(q => {
      if (q.questions) {
        q.questions.forEach(question => delete question.correctAnswerIndex);
      }
    });

    // Attach attempt status
    const quizIds = quizzes.map(q => q._id);
    const attempts = await QuizAttempt.find({
      studentId: req.user._id,
      quizId: { $in: quizIds }
    }).lean();

    const attemptMap = {};
    attempts.forEach(a => { attemptMap[a.quizId] = a; });

    quizzes = quizzes.map(q => ({
      ...q,
      attemptStatus: attemptMap[q._id] ? attemptMap[q._id].status : 'unattempted',
      score: attemptMap[q._id] ? attemptMap[q._id].score : null,
    }));
  }

  res.status(200).json(successResponse(quizzes));
});

/**
 * @route   POST /api/modules/:moduleId/quizzes
 * @access  Professor
 */
const createQuiz = asyncHandler(async (req, res, next) => {
  await getAccessDetails(req.params.moduleId, req.user);

  const { title, duration, questions, batchIds, published } = req.body;

  const quiz = await Quiz.create({
    moduleId: req.params.moduleId,
    title,
    duration,
    questions,
    batchIds: batchIds || [],
    published: published || false,
  });

  res.status(201).json(successResponse(quiz));
});

/**
 * @route   GET /api/quizzes/:id
 * @access  Authenticated
 */
const getQuizById = asyncHandler(async (req, res, next) => {
  let quiz = await Quiz.findById(req.params.id).lean();
  if (!quiz) return next(new ApiError(404, 'NOT_FOUND', 'Quiz not found'));

  const { enrollment } = await getAccessDetails(quiz.moduleId, req.user);

  if (req.user.role === 'student') {
    if (!quiz.published) return next(new ApiError(403, 'FORBIDDEN', 'Quiz not published'));
    
    if (quiz.batchIds && quiz.batchIds.length > 0) {
      if (!enrollment.batchId || !quiz.batchIds.some(b => b.toString() === enrollment.batchId.toString())) {
        return next(new ApiError(403, 'FORBIDDEN', 'Quiz is not available for your batch'));
      }
    }

    if (quiz.questions) {
      quiz.questions.forEach(q => delete q.correctAnswerIndex);
    }
  }

  res.status(200).json(successResponse(quiz));
});

/**
 * @route   GET /api/quizzes/:id/full
 * @access  Professor (Owner only)
 */
const getQuizFull = asyncHandler(async (req, res, next) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return next(new ApiError(404, 'NOT_FOUND', 'Quiz not found'));

  await getAccessDetails(quiz.moduleId, req.user);

  // Mongoose doc keeps correctAnswerIndex, we just don't pass the stripAnswers option
  res.status(200).json(successResponse(quiz));
});

/**
 * @route   PATCH /api/quizzes/:id
 * @access  Professor
 */
const updateQuiz = asyncHandler(async (req, res, next) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return next(new ApiError(404, 'NOT_FOUND', 'Quiz not found'));

  await getAccessDetails(quiz.moduleId, req.user);

  const { title, duration, questions, batchIds, published } = req.body;

  if (title) quiz.title = title;
  if (duration) quiz.duration = duration;
  if (questions) quiz.questions = questions;
  if (batchIds !== undefined) quiz.batchIds = batchIds;
  if (published !== undefined) quiz.published = published;

  await quiz.save();

  res.status(200).json(successResponse(quiz));
});

/**
 * @route   DELETE /api/quizzes/:id
 * @access  Professor
 */
const deleteQuiz = asyncHandler(async (req, res, next) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return next(new ApiError(404, 'NOT_FOUND', 'Quiz not found'));

  await getAccessDetails(quiz.moduleId, req.user);

  quiz.deletedAt = new Date();
  await quiz.save(); // cascades

  res.status(200).json(successResponse({}, 'Quiz deleted'));
});

module.exports = {
  getQuizzes,
  createQuiz,
  getQuizById,
  getQuizFull,
  updateQuiz,
  deleteQuiz,
};
