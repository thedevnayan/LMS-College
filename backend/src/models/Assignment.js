const mongoose = require('mongoose');

function arrayLimit(val) {
  return val.length <= 4;
}

const assignmentSchema = new mongoose.Schema(
  {
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      default: null, // Keep for backward-compat
    },
    courseOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOffering',
      default: null,
    },
    academicSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      default: null,
    },
    academicPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicPeriod',
      default: null,
    },
    teachingGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeachingGroup',
      default: null,
    },
    practicalGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PracticalGroup',
      default: null,
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
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
    allowLate: { type: Boolean, default: false },
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

assignmentSchema.index({ classroomId: 1, dueDate: 1 });
assignmentSchema.pre('validate', function () {
  if (this.startDate >= this.dueDate) this.invalidate('dueDate', 'Due date must follow start date');
  if (this.maxMarks < 0) this.invalidate('maxMarks', 'Marks cannot be negative');
  for (const q of this.questions) if (!Number.isInteger(q.correctOptionIndex) || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) this.invalidate('questions', 'Invalid answer key');
});
const Assignment = mongoose.model('Assignment', assignmentSchema);
module.exports = Assignment;
