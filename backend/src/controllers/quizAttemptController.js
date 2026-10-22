const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const Module = require('../models/Module');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Validates access, time limits, and calculates score
 */
const processAttempt = async (attempt, quiz, finalize = false) => {
  const timeLimitMs = (quiz.duration * 60 * 1000); // Server-authoritative deadline
  const timeTaken = Date.now() - attempt.startedAt.getTime();

  if (timeTaken > timeLimitMs) {
    throw new ApiError(409, 'TIME_EXPIRED', 'Quiz time has expired');
  }

  if (finalize) {
    let score = 0;
    
    // Map quiz questions for fast lookup
    const qMap = {};
    quiz.questions.forEach(q => {
      qMap[q._id.toString()] = { correct: q.correctAnswerIndex, marks: q.marks };
    });

    // Validate each question once; duplicate IDs must never multiply marks.
    const seen = new Set();
    for (const ans of attempt.answers) {
      const q = quiz.questions.id(ans.questionId);
      if (!q || seen.has(String(ans.questionId)) || !Number.isInteger(ans.selectedIndex) || ans.selectedIndex < 0 || ans.selectedIndex >= q.options.length) throw new ApiError(400, 'INVALID_ANSWERS', 'Invalid or duplicate answer');
      seen.add(String(ans.questionId));
    }
    // Calculate score
    attempt.answers.forEach(ans => {
      const q = qMap[ans.questionId.toString()];
      if (q && q.correct === ans.selectedIndex) {
        score += q.marks;
      }
    });

    attempt.score = score;
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
  }
};

/**
 * @route   POST /api/quizzes/:quizId/attempts
 * @access  Student (Enrolled)
 */
const startAttempt = asyncHandler(async (req, res, next) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz || !quiz.published) return next(new ApiError(404, 'NOT_FOUND', 'Quiz not found or not published'));

  const moduleObj = await Module.findById(quiz.moduleId);
  const enrollment = await Enrollment.findOne({ courseId: moduleObj.courseId, studentId: req.user._id });
  
  if (!enrollment) return next(new ApiError(403, 'FORBIDDEN', 'Not enrolled'));
  
  if (quiz.batchIds && quiz.batchIds.length > 0) {
    if (!enrollment.batchId || !quiz.batchIds.some(b => b.toString() === enrollment.batchId.toString())) {
      return next(new ApiError(403, 'FORBIDDEN', 'Quiz is not available for your batch'));
    }
  }

  try {
    const attempt = await QuizAttempt.create({
      quizId: quiz._id,
      studentId: req.user._id,
    });
    res.status(201).json(successResponse(attempt));
  } catch (err) {
    if (err.code === 11000) {
      return next(new ApiError(409, 'ATTEMPT_ALREADY_EXISTS', 'You have already attempted this quiz'));
    }
    next(err);
  }
});

/**
 * @route   PATCH /api/quiz-attempts/:id
 * @access  Student (Owner only)
 */
const autosaveAttempt = asyncHandler(async (req, res, next) => {
  const attempt = await QuizAttempt.findById(req.params.id);
  if (!attempt) return next(new ApiError(404, 'NOT_FOUND', 'Attempt not found'));

  if (attempt.studentId.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized'));
  }

  if (attempt.status === 'submitted') {
    return next(new ApiError(409, 'SUBMISSION_LOCKED', 'Quiz already submitted'));
  }

  const quiz = await Quiz.findById(attempt.quizId);
  
  await processAttempt(attempt, quiz, false); // Throws if time expired

  if (req.body.answers && (!Array.isArray(req.body.answers) || req.body.answers.length > 200)) throw new ApiError(400, 'INVALID_ANSWERS', 'Invalid answers');
  const { answers } = req.body;
  if (answers) {
    attempt.answers = answers;
    const saved = await QuizAttempt.updateOne({ _id: attempt._id, status: 'in_progress', __v: attempt.__v }, { $set: { answers: attempt.answers }, $inc: { __v: 1 } });
    if (!saved.modifiedCount) throw new ApiError(409, 'STALE_STATE', 'Attempt changed; reload before saving');
  }

  res.status(200).json(successResponse(attempt));
});

/**
 * @route   POST /api/quiz-attempts/:id/submit
 * @access  Student (Owner only)
 */
const submitAttempt = asyncHandler(async (req, res, next) => {
  const attempt = await QuizAttempt.findById(req.params.id);
  if (!attempt) return next(new ApiError(404, 'NOT_FOUND', 'Attempt not found'));

  if (attempt.studentId.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized'));
  }

  if (attempt.status === 'submitted') {
    return next(new ApiError(409, 'SUBMISSION_LOCKED', 'Quiz already submitted'));
  }

  const { answers } = req.body;
  if (answers) {
    attempt.answers = answers;
  }

  const quiz = await Quiz.findById(attempt.quizId);

  try {
    await processAttempt(attempt, quiz, true); // Finalizes score and sets status
    await attempt.save();
    res.status(200).json(successResponse(attempt));
  } catch (err) {
    // If it threw TIME_EXPIRED, we might still want to auto-submit whatever they had.
    // For MVP strictness as per edge-case list: "timer expiry rejects"
    next(err);
  }
});

module.exports = {
  startAttempt,
  autosaveAttempt,
  submitAttempt,
};
