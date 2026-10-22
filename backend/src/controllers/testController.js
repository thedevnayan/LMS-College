const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const Classroom = require('../models/Classroom');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');
const { classroomAccess, isStaff } = require('../services/access');
const engine = require('../services/assessment');
const fields = ['title', 'description', 'testType', 'timeLimit', 'questions', 'availableFrom', 'availableUntil', 'questionTimeLimitSeconds', 'fastestBonusPoints'];
const pick = body => Object.fromEntries(fields.filter(k => body[k] !== undefined).map(k => [k, body[k]]));
const emit = (room, name, data) => { try { require('../sockets/testSocket').getIo().to(String(room)).emit(name, data); } catch {} };
const getTests = asyncHandler(async (req, res) => {
  await classroomAccess(req.params.classroomId, req.user);
  const query = { classroomId: req.params.classroomId };
  if (req.user.role === 'student') query.status = { $in: ['published', 'active', 'completed'] };
  let tests = await Test.find(query).sort({ createdAt: -1 }).limit(200).lean();
  if (req.user.role === 'student') {
    const attempts = await TestAttempt.find({ testId: { $in: tests.map(t => t._id) }, studentId: req.user._id }).select('testId status').lean();
    const status = new Map(attempts.map(a => [String(a.testId), a.status]));
    tests = tests.map(t => ({ ...engine.studentTest(t), attemptStatus: status.get(String(t._id)) || 'unattempted' }));
  }
  res.json(successResponse(tests));
});
const getAllTestsForProfessor = asyncHandler(async (req, res) => {
  if (!isStaff(req.user)) throw new ApiError(403, 'FORBIDDEN', 'Staff access required');
  const classrooms = await Classroom.find(req.user.role === 'admin' ? {} : { professorId: req.user._id }).select('_id');
  const tests = await Test.find({ classroomId: { $in: classrooms.map(c => c._id) } }).populate({ path: 'classroomId', populate: { path: 'courseId', select: 'title' } }).sort('-createdAt').limit(200).lean();
  res.json(successResponse(tests));
});
const createTest = asyncHandler(async (req, res) => {
  await classroomAccess(req.params.classroomId, req.user, true);
  const test = await Test.create({ ...pick(req.body), status: req.body.status === 'published' ? 'published' : 'draft', classroomId: req.params.classroomId });
  if (test.status === 'published') emit('classroom_' + test.classroomId, 'test_hosted', { testId: test._id, classroomId: test.classroomId, title: test.title });
  res.status(201).json(successResponse(test));
});
const getTestById = asyncHandler(async (req, res) => {
  const test = await engine.authorizedTest(req.params.id, req.user);
  await test.populate({ path: 'classroomId', select: 'courseId classBatch type labBatch', populate: { path: 'courseId', select: 'title' } });
  res.json(successResponse(req.user.role === 'student' ? engine.studentTest(test) : test));
});
const updateTest = asyncHandler(async (req, res) => {
  let test = await engine.authorizedTest(req.params.id, req.user, true);
  if (req.body.liveStatus) {
    const action = { 'in-progress': 'start', ended: 'end' }[req.body.liveStatus];
    if (!action) throw new ApiError(400, 'INVALID_STATE', 'Cannot reset a live session');
    test = await engine.transition(test._id, req.user, action);
    emit(test._id, action === 'start' ? 'test_started' : 'test_ended', { testId: test._id, startTime: test.startTime, endTime: test.endTime, serverNow: Date.now() });
    return res.json(successResponse(test));
  }
  // Publication freezes question IDs, scoring and timing so attempts retain meaning.
  if (test.status !== 'draft' && Object.keys(pick(req.body)).length) throw new ApiError(409, 'TEST_LOCKED', 'Published tests are immutable; create a new test for changes');
  Object.assign(test, pick(req.body));
  if (req.body.status !== undefined) {
    if (test.status !== 'draft' || req.body.status !== 'published') throw new ApiError(409, 'INVALID_STATE', 'Only drafts can be published');
    if (!test.questions.length) throw new ApiError(400, 'NO_QUESTIONS', 'Add questions before publishing');
    test.status = 'published';
  }
  await test.save();
  if (test.status === 'published') emit('classroom_' + test.classroomId, 'test_hosted', { testId: test._id, classroomId: test.classroomId, title: test.title, message: 'A new test is available' });
  res.json(successResponse(test));
});
const deleteTest = asyncHandler(async (req, res) => {
  const test = await engine.authorizedTest(req.params.id, req.user, true);
  if (test.status !== 'draft' || await TestAttempt.exists({ testId: test._id })) throw new ApiError(409, 'TEST_LOCKED', 'Published tests and attempts must be retained');
  await test.deleteOne(); res.json(successResponse({}, 'Draft deleted'));
});
const generateJoinCode = asyncHandler(async (req, res) => {
  const test = await engine.authorizedTest(req.params.id, req.user, true);
  if (test.status === 'draft') throw new ApiError(409, 'TEST_NOT_OPEN', 'Publish the test first');
  test.joinCode = require('node:crypto').randomBytes(6).toString('hex').toUpperCase();
  await test.save(); res.json(successResponse({ joinCode: test.joinCode }));
});
const verifyJoinCode = asyncHandler(async (req, res) => {
  const found = await Test.findOne({ joinCode: req.params.code.toUpperCase() });
  if (!found) throw new ApiError(404, 'NOT_FOUND', 'Invalid join code');
  const test = await engine.authorizedTest(found._id, req.user); engine.assertAvailable(test);
  res.json(successResponse({ testId: test._id, title: test.title, liveStatus: test.liveStatus }));
});
const getLiveState = asyncHandler(async (req, res) => {
  const test = await engine.authorizedTest(req.params.id, req.user, true);
  const attempts = await TestAttempt.find({ testId: test._id }).populate('studentId', 'name').limit(1000).lean();
  const students = attempts.map(a => ({ userId: a.studentId?._id || a.guestId, userName: a.studentId?.name || a.guestName, score: a.score, completed: a.status === 'completed', answers: a.answers }));
  res.json(successResponse({ test, currentQuestionIndex: test.currentQuestionIndex, turnUserId: test.turnUserId, liveStatus: test.liveStatus, students }));
});
const getMyAttempt = asyncHandler(async (req, res) => {
  const test = await engine.authorizedTest(req.params.id, req.user);
  let attempt = await TestAttempt.findOne({ testId: test._id, studentId: req.user._id });
  if (attempt?.status === 'started' && attempt.deadlineAt && +attempt.deadlineAt <= Date.now()) {
    ({ attempt } = await engine.completeTest(test._id, req.user));
  }
  res.json(successResponse({ test: engine.studentTest(test), attempt: engine.studentAttempt(attempt, test), serverNow: Date.now(), liveState: { currentQuestionIndex: test.currentQuestionIndex, turnUserId: test.turnUserId, liveStatus: test.liveStatus, startTime: test.startTime, endTime: test.endTime } }));
});
const getTestReport = asyncHandler(async (req, res) => {
  const test = await engine.authorizedTest(req.params.id, req.user, true);
  await test.populate({ path: 'classroomId', populate: { path: 'courseId', select: 'title' } });
  const attempts = await TestAttempt.find({ testId: test._id }).populate('studentId', 'name email').sort({ score: -1, completedAt: 1, _id: 1 }).limit(1000).lean();
  const totalParticipants = attempts.length;
  res.json(successResponse({ test, attempts, stats: { totalParticipants, averageScore: totalParticipants ? attempts.reduce((s,a) => s + a.score, 0) / totalParticipants : 0, highestScore: attempts[0]?.score || 0, lowestScore: attempts.at(-1)?.score || 0 } }));
});
const getMyReport = asyncHandler(async (req, res) => {
  const test = await engine.authorizedTest(req.params.id, req.user);
  const attempt = await TestAttempt.findOne({ testId: test._id, studentId: req.user._id }).lean();
  if (!attempt || attempt.status !== 'completed') throw new ApiError(409, 'REPORT_NOT_READY', 'Complete this test to view your report');
  if (test.testType !== 'standard' && test.liveStatus !== 'ended') throw new ApiError(409, 'REPORT_NOT_READY', 'Your attempt is saved. The full report will be available when the live test ends.');
  res.json(successResponse({
    title: test.title, description: test.description, classroomId: test.classroomId,
    score: attempt.score, maximumScore: require('../services/assessmentStats').maximumScore(test),
    startedAt: attempt.startedAt, completedAt: attempt.completedAt,
    questions: test.questions.map(q => {
      const answer = attempt.answers.find(a => String(a.questionId) === String(q._id));
      return { _id: q._id, text: q.text, options: q.options, correctOptionIndex: q.correctOptionIndex,
        selectedOption: answer?.mcqOptionIndex ?? null, answerText: answer?.longAnswerText || '',
        pointsAwarded: answer?.pointsAwarded ?? 0,
        maximumPoints: require('../services/assessmentStats').maximumScore({ testType: test.testType, fastestBonusPoints: test.fastestBonusPoints, questions: [q] }) };
    }),
  }));
});
const guestDisabled = asyncHandler(async () => { throw new ApiError(403, 'AUTH_REQUIRED', 'Sign in with your enrolled student account. Anonymous access to batch assessments is disabled.'); });
module.exports = { getTests, getAllTestsForProfessor, createTest, getTestById, updateTest, deleteTest, generateJoinCode, verifyJoinCode, getLiveState, getMyAttempt, getMyReport, getTestReport, joinGuestTest: guestDisabled, getGuestLiveState: guestDisabled };
