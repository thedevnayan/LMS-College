const socketIo = require('socket.io');
const mongoose = require('mongoose');
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
    socket.on('join_test', async ({ testId, userId, guestId, userName, role }) => {
      socket.join(testId);
      console.log(`User ${userName} (${role}) joined test ${testId}`);
      
      const identity = role === 'guest' ? guestId : userId;

      if (role === 'student' || role === 'guest') {
        try {
          const query = role === 'guest' ? { testId, guestId } : { testId, studentId: userId };
          const update = {
            $setOnInsert: {
              testId,
              status: 'started',
              score: 0,
              answers: [],
              startedAt: new Date(),
              isGuest: role === 'guest'
            }
          };
          if (role === 'guest') {
            update.$setOnInsert.guestId = guestId;
            update.$setOnInsert.guestName = userName;
          } else {
            update.$setOnInsert.studentId = userId;
          }

          await TestAttempt.findOneAndUpdate(query, update, { upsert: true, new: true });
        } catch (err) {
          if (err.code !== 11000) console.error('Error upserting TestAttempt:', err);
        }
      }

      // Notify others in the room
      socket.to(testId).emit('user_joined', { userId: identity, userName, role, id: socket.id });
    });

    // ── Teacher starts the test ──
    socket.on('start_test', async ({ testId }) => {
      try {
        const test = await Test.findById(testId);
        if (!test) return;

        const startTime = new Date();
        let endTime = null;
        if (test.testType === 'time-based' && test.timeLimit > 0) {
          endTime = new Date(startTime.getTime() + test.timeLimit * 60000);
        }

        await Test.findByIdAndUpdate(testId, {
          liveStatus: 'in-progress',
          currentQuestionIndex: 0,
          startTime,
          endTime,
          answeredCurrentQuestion: []
        });

        io.to(testId).emit('test_started', { startTime, endTime });
      } catch (err) {
        console.error('Error starting test:', err);
      }
    });

    // ── Next Question (persisted to DB) ──
    socket.on('next_question', async ({ testId, nextQuestionIndex, turnUserId }) => {
      try {
        await Test.findByIdAndUpdate(testId, {
          currentQuestionIndex: nextQuestionIndex,
          turnUserId: turnUserId || null,
          answeredCurrentQuestion: [] // reset answers for new question
        });
      } catch (err) {
        console.error('Error advancing question:', err);
      }
      io.to(testId).emit('go_next_question', { nextQuestionIndex, turnUserId });
    });

    // ── Student submits an answer (SERVER AUTHORITATIVE) ──
    socket.on('submit_answer', async ({ testId, userId, guestId, role, userName, questionId, selectedOption, codingSourceCode }) => {
      try {
        const identity = role === 'guest' ? guestId : userId;
        const test = await Test.findById(testId);
        if (!test) return;
        
        // Only require liveStatus in-progress for live tests
        const isLiveTest = test.testType === 'live-fastest-finger' || test.testType === 'live-round-robin';
        if (isLiveTest && test.liveStatus !== 'in-progress') return;

        // Validation 1: Check timer for time-based
        if (test.testType === 'time-based' && test.endTime && new Date() > test.endTime) {
          return; // time expired, ignore
        }

        // Validation 2: Check turn for round-robin
        if (test.testType === 'live-round-robin' && test.turnUserId?.toString() !== identity.toString()) {
          return; // not their turn
        }

        // Fetch question details
        const question = test.questions.id(questionId);
        if (!question) return;

        // Fetch attempt
        const query = role === 'guest' ? { testId, guestId } : { testId, studentId: userId };
        const attempt = await TestAttempt.findOne(query);
        if (!attempt || attempt.status === 'completed') return;

        // Validation 3: Check if already answered
        const alreadyAnswered = attempt.answers.some(a => a.questionId.toString() === questionId.toString());
        if (alreadyAnswered) return;

        // Determine correctness and points
        let isCorrect = false;
        let pointsAwarded = 0;

        if (question.questionType === 'mcq') {
          isCorrect = (selectedOption === question.correctOptionIndex);
        } else if (question.questionType === 'coding') {
          // Simplification for coding without a runner
          isCorrect = codingSourceCode && codingSourceCode.trim().length > 0;
        }

        if (isCorrect) {
          pointsAwarded = question.points || 1;
        }

        // Fastest Finger First logic
        if (test.testType === 'live-fastest-finger') {
          // Atomic push if not already in array
          const updatedTest = await Test.findOneAndUpdate(
            { _id: testId, answeredCurrentQuestion: { $ne: identity } },
            { $push: { answeredCurrentQuestion: identity } },
            { new: true }
          );
          
          if (updatedTest) {
            const index = updatedTest.answeredCurrentQuestion.findIndex(id => id.toString() === identity.toString());
            if (index === 0 && isCorrect) {
              pointsAwarded = 10; // Fastest gets 10 points
            } else if (isCorrect) {
              pointsAwarded = question.points || 1; // Normal points for others
            } else {
              pointsAwarded = 0; // Wrong
            }
          } else {
            pointsAwarded = 0;
          }
        }

        // Persist Answer
        const answerPayload = {
          questionId,
          isCorrect,
          pointsAwarded,
          mcqOptionIndex: selectedOption,
          codingSourceCode
        };

        const updatedAttempt = await TestAttempt.findOneAndUpdate(
          query,
          {
            $push: { answers: answerPayload },
            $inc: { score: pointsAwarded } // Atomic increment
          },
          { new: true }
        );

        // Broadcast to teacher dashboard
        const displayName = role === 'guest' ? attempt.guestName : (userName || 'Student'); 
        io.to(testId).emit('student_answered', { 
          userId: identity, 
          userName: displayName,
          questionId, 
          isCorrect, 
          points: pointsAwarded, 
          currentScore: updatedAttempt.score 
        });

      } catch (err) {
        console.error('Error persisting answer:', err);
      }
    });

    // ── Student completes the test (persisted to DB) ──
    socket.on('test_completed', async ({ testId, userId, guestId, role, userName }) => {
      try {
        const query = role === 'guest' ? { testId, guestId } : { testId, studentId: userId };
        const attempt = await TestAttempt.findOneAndUpdate(
          query,
          { $set: { status: 'completed', completedAt: new Date() } },
          { new: true }
        );
        if (attempt) {
          const identity = role === 'guest' ? guestId : userId;
          const displayName = role === 'guest' ? attempt.guestName : (userName || 'Student'); 
          io.to(testId).emit('student_completed', { userId: identity, userName: displayName, finalScore: attempt.score });
        }
      } catch (err) {
        console.error('Error completing test attempt:', err);
      }
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
