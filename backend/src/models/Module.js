const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
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

// TTL Index for soft deletes (7 days)
moduleSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 604800 });

// Pre-find hook to exclude soft-deleted items
moduleSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null });
  next();
});

// Cascade soft-delete to Materials, Assignments, and Quizzes
moduleSchema.pre('save', async function (next) {
  if (this.isModified('deletedAt') && this.deletedAt !== null) {
    const Material = mongoose.model('Material');
    const Assignment = mongoose.model('Assignment');
    const Quiz = mongoose.model('Quiz');
    
    await Material.updateMany({ moduleId: this._id }, { deletedAt: this.deletedAt });
    await Assignment.updateMany({ moduleId: this._id }, { deletedAt: this.deletedAt });
    await Quiz.updateMany({ moduleId: this._id }, { deletedAt: this.deletedAt });
  }
  next();
});

const Module = mongoose.model('Module', moduleSchema);
module.exports = Module;
