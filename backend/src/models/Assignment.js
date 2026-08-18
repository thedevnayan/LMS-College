const mongoose = require('mongoose');

function arrayLimit(val) {
  return val.length <= 4;
}

const assignmentSchema = new mongoose.Schema(
  {
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    dueDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    maxMarks: {
      type: Number,
      required: [true, 'Max marks is required'],
    },
    attachments: {
      type: [String],
      default: [],
    },
    questions: [
      {
        text: {
          type: String,
          required: true,
        },
        options: {
          type: [String],
          validate: [arrayLimit, '{PATH} exceeds the limit of 4'],
          default: ['', '', '', ''],
        },
        correctOptionIndex: {
          type: Number,
          default: 0,
        },
        marks: {
          type: Number,
          default: 1,
        },
      }
    ],
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// TTL Index for soft deletes
assignmentSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 604800 });

assignmentSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

// Cascade soft-delete to Submissions
assignmentSchema.pre('save', async function () {
  if (this.isModified('deletedAt') && this.deletedAt !== null) {
    const Submission = mongoose.model('Submission');
    await Submission.updateMany({ assignmentId: this._id }, { deletedAt: this.deletedAt });
  }
});

const Assignment = mongoose.model('Assignment', assignmentSchema);
module.exports = Assignment;
