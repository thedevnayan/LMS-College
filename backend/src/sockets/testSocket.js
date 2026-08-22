const socketIo = require('socket.io');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join classroom for notifications (assignments, new tests, etc.)
    socket.on('join_classroom', (classroomId) => {
      socket.join(`classroom_${classroomId}`);
    });

    // ── Join a specific test room ──
    socket.on('join_test', async ({ testId, userId, userName, role }) => {
      socket.join(testId);
      console.log(`User ${userName} (${role}) joined test ${testId}`);

      if (role === 'student') {
        // Upsert a TestAttempt so the student is tracked in the DB
        try {
          await TestAttempt.findOneAndUpdate(
            { testId, studentId: userId },
            { $setOnInsert: { testId, studentId: userId, status: 'started', score: 0, answers: [], startedAt: new Date() } },
            { upsert: true, new: true }
          );
        } catch (err) {
          // Ignore duplicate key errors (already exists)
          if (err.code !== 11000) console.error('Error upserting TestAttempt:', err);
        }
      }

      // Notify others in the room
      socket.to(testId).emit('user_joined', { userId, userName, role, id: socket.id });
    });

    // ── Teacher starts the test ──
    socket.on('start_test', async ({ testId }) => {
      try {
        await Test.findByIdAndUpdate(testId, { liveStatus: 'in-progress', currentQuestionIndex: 0 });
      } catch (err) {
        console.error('Error starting test:', err);
      }
      io.to(testId).emit('test_started', { timestamp: Date.now() });
    });

    // ── Next Question (persisted to DB) ──
    socket.on('next_question', async ({ testId, nextQuestionIndex, turnUserId }) => {
      try {
        await Test.findByIdAndUpdate(testId, {
          currentQuestionIndex: nextQuestionIndex,
          turnUserId: turnUserId || null
        });
      } catch (err) {
        console.error('Error advancing question:', err);
      }
      io.to(testId).emit('go_next_question', { nextQuestionIndex, turnUserId });
    });

    // ── Student submits an answer (persisted to DB immediately) ──
    socket.on('submit_answer', async ({ testId, userId, userName, questionId, selectedOption, isCorrect, points, currentScore }) => {
      try {
        // Push the answer into the student's TestAttempt and update score atomically
        await TestAttempt.findOneAndUpdate(
          { testId, studentId: userId },
          {
            $push: {
              answers: {
                questionId,
                mcqOptionIndex: selectedOption,
                isCorrect,
                pointsAwarded: points
              }
            },
            $set: { score: currentScore }
          }
        );
      } catch (err) {
        console.error('Error persisting answer:', err);
      }

      // Broadcast to teacher dashboard
      io.to(testId).emit('student_answered', { userId, userName, questionId, isCorrect, points, currentScore });
    });

    // ── Student completes the test (persisted to DB) ──
    socket.on('test_completed', async ({ testId, userId, userName, finalScore }) => {
      try {
        await TestAttempt.findOneAndUpdate(
          { testId, studentId: userId },
          { $set: { status: 'completed', score: finalScore, completedAt: new Date() } }
        );
      } catch (err) {
        console.error('Error completing test attempt:', err);
      }

      io.to(testId).emit('student_completed', { userId, userName, finalScore });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = { initSocket, getIo };
