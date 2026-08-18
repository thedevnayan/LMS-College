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
      required: true,
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

// A student can attempt a test multiple times? Let's say yes for now, but usually it's once.
// testAttemptSchema.index({ testId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('TestAttempt', testAttemptSchema);
