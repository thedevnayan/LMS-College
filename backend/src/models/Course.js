const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      unique: true, // Edge case: Unique titles globally
    },
    description: {
      type: String,
      default: '',
    },
    thumbnail: {
      type: String,
      default: '',
    },
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// TTL Index: automatically delete document 7 days (604800 seconds) after deletedAt is set
courseSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 604800 });

// Pre-find hook to exclude soft-deleted items
courseSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null });
  next();
});

// Virtual for moduleCount
courseSchema.virtual('moduleCount', {
  ref: 'Module',
  localField: '_id',
  foreignField: 'courseId',
  count: true,
});

// We can't automatically populate count in the schema easily without lean queries,
// so controllers will handle injecting moduleCount if necessary, or we use populate.

// Cascade soft-delete to modules, enrollments, and batches
courseSchema.pre('save', async function (next) {
  if (this.isModified('deletedAt') && this.deletedAt !== null) {
    const Module = mongoose.model('Module');
    const Enrollment = mongoose.model('Enrollment');
    const MaterialProgress = mongoose.model('MaterialProgress');
    const Batch = mongoose.model('Batch');

    // Soft delete related documents
    await Module.updateMany({ courseId: this._id }, { deletedAt: this.deletedAt });
    await Enrollment.updateMany({ courseId: this._id }, { deletedAt: this.deletedAt });
    await MaterialProgress.updateMany({ courseId: this._id }, { deletedAt: this.deletedAt });
    await Batch.updateMany({ courseId: this._id }, { deletedAt: this.deletedAt });
  }
  next();
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
