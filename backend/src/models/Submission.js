const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'graded'],
      default: 'pending',
    },
    marks: {
      type: Number,
      default: null,
    },
    feedback: {
      type: String,
      default: null,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    gradedAt: {
      type: Date,
      default: null,
    },
    isLate: {
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

submissionSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 604800 });

// Ensure a student can only submit once per assignment
submissionSchema.index(
  { studentId: 1, assignmentId: 1 }, 
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

submissionSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null });
  next();
});

const Submission = mongoose.model('Submission', submissionSchema);
module.exports = Submission;
