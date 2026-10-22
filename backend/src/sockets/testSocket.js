const { Server } = require('socket.io');
const { authenticate } = require('../services/tokens');
const { classroomAccess, isStaff } = require('../services/access');
const engine = require('../services/assessment');
const { ApiError } = require('../middleware/errorHandler');
const { corsOrigin, originAllowed } = require('../config/security');
let io;
const staffRoom = id => 'test_staff_' + id;
function initSocket(server) {
  io = new Server(server, { maxHttpBufferSize: 64 * 1024, cors: { origin: corsOrigin, credentials: true }, allowRequest: (req, cb) => cb(null, originAllowed(req.headers.origin)) });
  io.use(async (socket, next) => {
    try { socket.data.user = await authenticate(socket.handshake.auth?.token); next(); }
    catch (e) { next(new Error(e.statusCode < 500 ? e.message : 'Authentication unavailable')); }
  });
  io.on('connection', socket => {
    socket.join('user_' + socket.data.user._id);
    let count = 0, windowStart = Date.now();
    const handle = (name, action) => socket.on(name, async (payload = {}, ack) => {
      try {
        if (Date.now() - windowStart >= 10000) { count = 0; windowStart = Date.now(); }
        if (++count > 80) throw new ApiError(429, 'RATE_LIMITED', 'Too many live actions');
        const user = await authenticate(socket.handshake.auth?.token);
        socket.data.user = user;
        const result = await action(payload, user);
        if (typeof ack === 'function') ack({ success: true, data: result });
      } catch (e) {
        const error = { code: e.errorCode || 'LIVE_ERROR', message: e.statusCode && e.statusCode < 500 ? e.message : 'Live operation unavailable; retry or contact staff' };
        if (typeof ack === 'function') ack({ success: false, error });
        else socket.emit('operation_error', error);
        if (e.statusCode === 401 || e.errorCode === 'LOGIN_REVOKED') { socket.emit(e.errorCode === 'TOKEN_EXPIRED' ? 'session_expired' : 'access_revoked', error); socket.disconnect(true); }
      }
    });
    handle('join_classroom', async (classroomId, user) => {
      await classroomAccess(classroomId, user); await socket.join('classroom_' + classroomId);
    });
    handle('join_test', async ({ testId }, user) => {
      const { test, attempt } = await engine.joinTest(testId, user);
      if (socket.data.testId && socket.data.testId !== String(testId)) {
        await socket.leave(socket.data.testId); await socket.leave(staffRoom(socket.data.testId));
      }
      const participantRoom = 'participant_' + testId + '_' + user._id;
      if (!isStaff(user)) {
        // One active test connection per student; a reconnect supersedes the old socket.
        const prior = await io.in(participantRoom).fetchSockets();
        for (const other of prior) if (other.id !== socket.id) { other.emit('session_replaced'); other.disconnect(true); }
        await socket.join(participantRoom);
      }
      await socket.join(String(testId));
      if (isStaff(user)) await socket.join(staffRoom(testId));
      socket.data.testId = String(testId);
      if (!isStaff(user)) io.to(staffRoom(testId)).emit('user_joined', { userId: user._id, userName: user.name, role: user.role, id: socket.id, score: attempt.score, completed: attempt.status === 'completed' });
      return { test: isStaff(user) ? test : engine.studentTest(test), attempt: engine.studentAttempt(attempt, test), serverNow: Date.now() };
    });
    handle('start_test', async ({ testId }, user) => {
      const test = await engine.transition(testId, user, 'start');
      const state = { startTime: test.startTime, endTime: test.endTime, serverNow: Date.now() };
      io.to(String(testId)).emit('test_started', state); return state;
    });
    handle('next_question', async (payload, user) => {
      const test = await engine.transition(payload.testId, user, 'next', payload);
      const state = { nextQuestionIndex: test.currentQuestionIndex, turnUserId: test.turnUserId, questionReleasedAt: test.questionReleasedAt, questionDeadlineAt: test.questionDeadlineAt, serverNow: Date.now() };
      io.to(String(test._id)).emit('go_next_question', state); return state;
    });
    handle('submit_answer', async (payload, user) => {
      if (socket.data.testId !== String(payload.testId)) throw new ApiError(403, 'JOIN_REQUIRED', 'Join this test first');
      const result = await engine.submitAnswer(payload.testId, user, payload);
      const data = { userId: user._id, userName: user.name, questionId: payload.questionId, isCorrect: result.answer?.isCorrect, points: result.answer?.pointsAwarded, currentScore: result.attempt.score };
      if (!result.duplicate) io.to(staffRoom(payload.testId)).emit('student_answered', data);
      const publicData = result.test.testType === 'standard' ? { userId: user._id, questionId: payload.questionId, currentScore: 0 } : data;
      socket.emit('student_answered', publicData);
      return { accepted: true, duplicate: result.duplicate, ...publicData };
    });
    handle('test_completed', async ({ testId }, user) => {
      if (user.role !== 'student') throw new ApiError(403, 'FORBIDDEN', 'Student access required');
      const { attempt } = await engine.completeTest(testId, user);
      const data = { userId: user._id, userName: user.name, finalScore: attempt.score };
      io.to(staffRoom(testId)).emit('student_completed', data); return data;
    });
    socket.on('disconnect', () => {
      if (socket.data.testId) io.to(staffRoom(socket.data.testId)).emit('participant_disconnected', { userId: socket.data.user._id });
    });
  });
  // Bounded periodic revalidation also removes suspended/expired idle listeners.
  let sweeping = false;
  const sweep = setInterval(async () => {
    if (sweeping) return; sweeping = true;
    try {
      await engine.expireAttempts();
      const sockets = [...io.sockets.sockets.values()];
      for (let i = 0; i < sockets.length; i += 20) await Promise.all(sockets.slice(i, i + 20).map(async socket => {
        try { await authenticate(socket.handshake.auth?.token); }
        catch (error) {
          if (![401, 403].includes(error.statusCode)) throw error;
          socket.emit(error.errorCode === 'TOKEN_EXPIRED' ? 'session_expired' : 'access_revoked', { message: 'Session expired or access suspended' }); socket.disconnect(true);
        }
      }));
    } catch (error) { console.error(JSON.stringify({ event: 'live_maintenance_error', ...require('../utils/runtimeError').diagnostic(error) })); }
    finally { sweeping = false; }
  }, 15000).unref();
  server.on('close', () => clearInterval(sweep));
  return io;
}
const getIo = () => { if (!io) throw new Error('Socket server unavailable'); return io; };
module.exports = { initSocket, getIo };
