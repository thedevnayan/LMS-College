const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  // Depending on questionType
  mcqOptionIndex: { type: Number, default: null },
  longAnswerText: { type: String, default: '' },
  codingSourceCode: { type: String, default: '' },
  
  // Grading
  isCorrect: { type: Boolean, default: false },
  pointsAwarded: { type: Number, default: 0 }
});

const testAttemptSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional for guests
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    guestId: {
      type: String,
      required: false,
    },
    guestName: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['started', 'completed'],
      default: 'started',
    },
    score: {
      type: Number,
      default: 0,
    },
    answers: [answerSchema],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    }
  },
  {
    timestamps: true,
  }
);

// Unique index for students
testAttemptSchema.index(
  { testId: 1, studentId: 1 }, 
  { unique: true, partialFilterExpression: { studentId: { $type: 'objectId' } } }
);

// Unique index for guests
testAttemptSchema.index(
  { testId: 1, guestId: 1 }, 
  { unique: true, partialFilterExpression: { guestId: { $type: 'string' } } }
);

module.exports = mongoose.model('TestAttempt', testAttemptSchema);
