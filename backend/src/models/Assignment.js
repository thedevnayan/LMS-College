const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
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
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    maxMarks: {
      type: Number,
      required: [true, 'Max marks is required'],
    },
    attachments: {
      type: [String],
      default: [],
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
