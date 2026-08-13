const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  selectedIndex: {
    type: Number,
    required: true,
  }
});

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    answers: [answerSchema],
    score: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted'],
      default: 'in_progress',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

quizAttemptSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 604800 });

// One active or submitted attempt per student per quiz
quizAttemptSchema.index(
  { studentId: 1, quizId: 1 }, 
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

quizAttemptSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null });
  next();
});

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
module.exports = QuizAttempt;
