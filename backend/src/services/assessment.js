const mongoose = require('mongoose');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const { classroomAccess, sameId, isStaff } = require('./access');
const { ApiError } = require('../middleware/errorHandler');
const { serializeRoom } = require('./liveQueue');
const competitive = test => ['live-fastest-finger', 'live-round-robin'].includes(test.testType);
const live = test => test.testType !== 'standard';

function assertAvailable(test, now = Date.now()) {
  if (!['published', 'active'].includes(test.status) || test.liveStatus === 'ended') throw new ApiError(409, 'TEST_CLOSED', 'Test is not available');
  if (test.availableFrom && now < +new Date(test.availableFrom)) throw new ApiError(409, 'TEST_NOT_OPEN', 'Test has not opened');
  if (test.availableUntil && now >= +new Date(test.availableUntil)) throw new ApiError(409, 'TEST_CLOSED', 'Test has closed');
}
function scoreMCQ(question, selectedOption) {
  if (question.questionType !== 'mcq') throw new ApiError(503, 'JUDGE_UNAVAILABLE', 'Coding questions require an isolated judge');
  if (!Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption >= question.options.length) throw new ApiError(400, 'INVALID_ANSWER', 'Select a valid option');
  const isCorrect = selectedOption === question.correctOptionIndex;
  return { isCorrect, pointsAwarded: isCorrect ? question.points : 0 };
}
function studentTest(test) {
  const data = test.toObject ? test.toObject() : JSON.parse(JSON.stringify(test));
  delete data.sessionToken; delete data.joinCode; delete data.answeredCurrentQuestion;
  data.questions = (data.questions || []).map((q, index) => {
    delete q.correctOptionIndex;
    q.testCases = (q.testCases || []).filter(tc => tc.isHidden === false);
    if ((data.availableFrom && +new Date(data.availableFrom) > Date.now()) || (live(data) && data.liveStatus === 'waiting') || (competitive(data) && index > data.currentQuestionIndex)) {
      return { _id: q._id, questionType: q.questionType, text: 'Waiting for question release', options: [] };
    }
    return q;
  });
  return data;
}
function studentAttempt(attempt, test) {
  if (!attempt) return null;
  const data = attempt.toObject ? attempt.toObject() : JSON.parse(JSON.stringify(attempt));
  if (test.testType === 'standard' && data.status !== 'completed') {
    data.score = 0;
    data.answers = data.answers.map(({ isCorrect, pointsAwarded, ...answer }) => answer);
  }
  return data;
}
async function authorizedTest(id, user, write = false, session) {
  const query = Test.findById(id);
  if (session) query.session(session);
  const test = await query;
  if (!test) throw new ApiError(404, 'NOT_FOUND', 'Test not found');
  await classroomAccess(test.classroomId, user, write);
  if (user.role === 'student' && test.status === 'draft') throw new ApiError(404, 'NOT_FOUND', 'Test not found');
  return test;
}
function deadline(test, startedAt) {
  const bounds = [test.availableUntil, live(test) ? test.endTime : null].filter(Boolean).map(x => +new Date(x));
  if (!live(test) && test.timeLimit > 0) bounds.push(+startedAt + test.timeLimit * 60000);
  return bounds.length ? new Date(Math.min(...bounds)) : null;
}
async function joinTest(id, user) {
  const test = await authorizedTest(id, user);
  if (isStaff(user)) return { test, attempt: null };
  assertAvailable(test);
  const now = new Date();
  const values = { testId: test._id, studentId: user._id, startedAt: now, deadlineAt: deadline(test, now) };
  let attempt;
  try {
    attempt = await TestAttempt.findOneAndUpdate({ testId: id, studentId: user._id }, { $setOnInsert: values }, { upsert: true, returnDocument: 'after', runValidators: true });
  } catch (err) {
    if (err.code !== 11000) throw err;
    attempt = await TestAttempt.findOne({ testId: id, studentId: user._id });
  }
  return { test, attempt };
}
async function transition(id, user, action, payload = {}) {
  return serializeRoom(id, () => mongoose.connection.transaction(async session => {
    const test = await authorizedTest(id, user, true, session);
    const now = new Date();
    if (action === 'start') {
      if (!live(test)) throw new ApiError(409, 'INVALID_MODE', 'Standard tests start per student');
      if (test.liveStatus === 'in-progress') return test;
      assertAvailable(test, +now);
      if (!test.questions.length) throw new ApiError(400, 'NO_QUESTIONS', 'Add questions before starting');
      test.liveStatus = 'in-progress'; test.status = 'active'; test.startTime = now;
      test.currentQuestionIndex = 0;
      test.endTime = test.timeLimit > 0 ? new Date(+now + test.timeLimit * 60000) : test.availableUntil;
      if (test.availableUntil && (!test.endTime || test.endTime > test.availableUntil)) test.endTime = test.availableUntil;
    } else if (action === 'next') {
      if (!competitive(test) || test.liveStatus !== 'in-progress' || (test.endTime && +test.endTime <= +now)) throw new ApiError(409, 'INVALID_STATE', 'Question progression is unavailable');
      const idx = payload.nextQuestionIndex;
      // A round-robin initial turn can be assigned once without resetting time.
      const initialTurn = test.testType === 'live-round-robin' && !test.turnUserId && idx === test.currentQuestionIndex;
      if (!initialTurn && idx !== test.currentQuestionIndex + 1) throw new ApiError(409, 'STALE_STATE', 'Question has already advanced or index is invalid');
      if (idx >= test.questions.length) throw new ApiError(400, 'INVALID_QUESTION', 'No next question');
      if (test.testType === 'live-round-robin') {
        if (!mongoose.isValidObjectId(payload.turnUserId) || !await TestAttempt.exists({ testId: id, studentId: payload.turnUserId, status: 'started' }).session(session)) throw new ApiError(400, 'INVALID_PARTICIPANT', 'Choose a joined participant');
        test.turnUserId = payload.turnUserId;
      }
      if (initialTurn) { await test.save({ session }); return test; }
      test.currentQuestionIndex = idx;
    } else if (action === 'end') {
      if (test.liveStatus === 'ended') return test;
      test.liveStatus = 'ended'; test.status = 'completed'; test.endTime = now;
      await TestAttempt.updateMany({ testId: id, status: 'started' }, { $set: { status: 'completed', completedAt: now } }, { session });
      await test.save({ session }); return test;
    } else throw new ApiError(400, 'INVALID_ACTION', 'Unknown test transition');
    test.questionReleasedAt = now;
    test.questionDeadlineAt = competitive(test) ? new Date(+now + test.questionTimeLimitSeconds * 1000) : null;
    test.answeredCurrentQuestion = [];
    await test.save({ session });
    if (action === 'start') await TestAttempt.updateMany({ testId: id, status: 'started' }, { $set: { deadlineAt: test.endTime } }, { session });
    return test;
  }));
}
async function submitAnswer(id, user, payload) {
  if (user.role !== 'student') throw new ApiError(403, 'FORBIDDEN', 'Student access required');
  const receivedAt = new Date();
  return serializeRoom(id, async () => {
    await require('./access').assertAccountAccess(user);
    return mongoose.connection.transaction(async session => {
    const test = await authorizedTest(id, user, false, session);
    const attempt = await TestAttempt.findOne({ testId: id, studentId: user._id }).session(session);
    if (!attempt) throw new ApiError(409, 'JOIN_REQUIRED', 'Join the test first');
    const existing = attempt.answers.find(a => sameId(a.questionId, payload.questionId));
    if (existing) return { test, attempt, duplicate: true };
    assertAvailable(test, +receivedAt);
    if (attempt.status !== 'started') throw new ApiError(409, 'ATTEMPT_CLOSED', 'Attempt is completed');
    if (live(test) && test.liveStatus !== 'in-progress') throw new ApiError(409, 'TEST_NOT_STARTED', 'Wait for the teacher to start');
    const expires = attempt.deadlineAt || deadline(test, attempt.startedAt);
    if (expires && +expires <= +receivedAt) throw new ApiError(409, 'TIME_EXPIRED', 'Answer deadline has passed');
    const question = test.questions.id(payload.questionId);
    if (!question) throw new ApiError(400, 'INVALID_QUESTION', 'Question is not in this test');
    if (competitive(test)) {
      if (!sameId(test.questions[test.currentQuestionIndex]?._id, question._id)) throw new ApiError(409, 'QUESTION_CLOSED', 'Question is not currently open');
      if (!test.questionDeadlineAt || +test.questionDeadlineAt <= +receivedAt) throw new ApiError(409, 'TIME_EXPIRED', 'Question deadline has passed');
      if (test.testType === 'live-round-robin' && !sameId(test.turnUserId, user._id)) throw new ApiError(403, 'NOT_YOUR_TURN', 'Wait for your turn');
    }
    const result = scoreMCQ(question, payload.selectedOption);
    if (test.testType === 'live-fastest-finger' && result.isCorrect) {
      if (!test.answeredCurrentQuestion.length) result.pointsAwarded = test.fastestBonusPoints;
      test.answeredCurrentQuestion.push(user._id);
    }
    // Serialize live answers with transitions in the same transaction. This
    // prevents scoring an old question across a simultaneous next/end request.
    if (live(test)) { test.answerSequence = (test.answerSequence || 0) + 1; await test.save({ session }); }
    const updated = await TestAttempt.findOneAndUpdate({ _id: attempt._id, status: 'started', 'answers.questionId': { $ne: question._id } }, {
      $push: { answers: { questionId: question._id, mcqOptionIndex: payload.selectedOption, ...result, receivedAt } },
      $inc: { score: result.pointsAwarded },
    }, { session, returnDocument: 'after', runValidators: true });
    if (!updated) throw new ApiError(409, 'STALE_STATE', 'Attempt changed; refresh and retry');
    return { test, attempt: updated, duplicate: false, answer: { questionId: question._id, ...result } };
    });
  });
}
async function completeTest(id, user) {
  const test = await authorizedTest(id, user);
  const attempt = await TestAttempt.findOneAndUpdate({ testId: id, studentId: user._id, status: 'started' }, { $set: { status: 'completed', completedAt: new Date() } }, { returnDocument: 'after' }) || await TestAttempt.findOne({ testId: id, studentId: user._id });
  if (!attempt) throw new ApiError(404, 'NOT_FOUND', 'Attempt not found');
  return { test, attempt };
}
async function expireAttempts() {
  const now = new Date();
  const [attempts, tests] = await Promise.all([
    TestAttempt.find({ status: 'started', deadlineAt: { $ne: null, $lte: now } }).select('testId').limit(1000).lean(),
    Test.find({ liveStatus: 'in-progress', endTime: { $ne: null, $lte: now } }).select('_id').limit(1000).lean(),
  ]);
  const ids = [...new Set([...attempts.map(a => String(a.testId)), ...tests.map(t => String(t._id))])];
  // Expiry follows already-received answers in each room, so queue latency
  // cannot turn a timely accepted request into an expired attempt.
  await Promise.all(ids.map(id => serializeRoom(id, async () => {
    await TestAttempt.updateMany({ testId: id, status: 'started', deadlineAt: { $ne: null, $lte: now } }, { $set: { status: 'completed', completedAt: now } });
    await Test.updateOne({ _id: id, liveStatus: 'in-progress', endTime: { $ne: null, $lte: now } }, { $set: { liveStatus: 'ended', status: 'completed' } });
  })));
}
module.exports = { competitive, live, assertAvailable, scoreMCQ, studentTest, studentAttempt, authorizedTest, joinTest, transition, submitAnswer, completeTest, expireAttempts, deadline };
