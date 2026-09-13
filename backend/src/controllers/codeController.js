const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const { successResponse } = require('../utils/response');
const { executeCode } = require('../utils/codeExecutor');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');

// @desc    Run code with custom input
// @route   POST /api/code/run
// @access  Private
const runCode = asyncHandler(async (req, res, next) => {
  const { language, code, input } = req.body;
  if (!language || !code) {
    return next(new ApiError(400, 'BAD_REQUEST', 'Language and code are required'));
  }

  const result = await executeCode(language, code, input || '');
  res.status(200).json(successResponse(result));
});

// @desc    Submit code for a test question (runs all test cases)
// @route   POST /api/code/submit/:testId/:questionId
// @access  Private
const submitCode = asyncHandler(async (req, res, next) => {
  const { testId, questionId } = req.params;
  const { language, code } = req.body;

  if (!language || !code) {
    return next(new ApiError(400, 'BAD_REQUEST', 'Language and code are required'));
  }

  const test = await Test.findById(testId);
  if (!test) return next(new ApiError(404, 'NOT_FOUND', 'Test not found'));

  const question = test.questions.id(questionId);
  if (!question || question.questionType !== 'coding') {
    return next(new ApiError(404, 'NOT_FOUND', 'Coding question not found'));
  }

  const testCases = question.testCases || [];
  const results = [];
  let passedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const execResult = await executeCode(language, code, tc.input || '');
    
    const rawOutput = execResult.stdout.trim();
    const expected = (tc.expectedOutput || '').trim();
    
    const passed = execResult.success && rawOutput === expected;
    if (passed) passedCount++;

    results.push({
      testCaseIndex: i + 1,
      passed,
      input: tc.isHidden ? 'Hidden' : tc.input,
      expectedOutput: tc.isHidden ? 'Hidden' : expected,
      actualOutput: execResult.stderr ? execResult.stderr : rawOutput,
      isHidden: tc.isHidden
    });
  }

  const isCorrect = testCases.length > 0 && passedCount === testCases.length;
  const pointsAwarded = isCorrect ? (question.points || 1) : 0;

  res.status(200).json(successResponse({
    passedCount,
    totalCount: testCases.length,
    isCorrect,
    pointsAwarded,
    results
  }));
});

module.exports = {
  runCode,
  submitCode
};
