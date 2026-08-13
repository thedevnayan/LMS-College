const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
    validate: [v => v.length >= 2, 'A question must have at least 2 options'],
  },
  correctAnswerIndex: {
    type: Number,
    required: true,
  },
  marks: {
    type: Number,
    required: true,
  }
});

const quizSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, 'Duration (minutes) is required'],
    },
    questions: [questionSchema],
    batchIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Batch',
      default: [], // Empty means visible to whole course
    },
    published: {
      type: Boolean,
      default: false,
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

quizSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 604800 });

quizSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null });
  next();
});

// Strip correctAnswerIndex when returning to students
// Note: This needs to happen on the controller level too since lean() bypasses toJSON,
// but adding it here is a good safety net.
quizSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    if (options && options.stripAnswers) {
      if (ret.questions) {
        ret.questions.forEach((q) => {
          delete q.correctAnswerIndex;
        });
      }
    }
    return ret;
  },
});

// Cascade soft-delete to QuizAttempts
quizSchema.pre('save', async function (next) {
  if (this.isModified('deletedAt') && this.deletedAt !== null) {
    const QuizAttempt = mongoose.model('QuizAttempt');
    await QuizAttempt.updateMany({ quizId: this._id }, { deletedAt: this.deletedAt });
  }
  next();
});

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
