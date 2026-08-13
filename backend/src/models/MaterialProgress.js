const mongoose = require('mongoose');

const materialProgressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true, // Denormalized for fast progress queries
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
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

materialProgressSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 604800 });
materialProgressSchema.index(
  { studentId: 1, materialId: 1 }, 
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

materialProgressSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null });
  next();
});

const MaterialProgress = mongoose.model('MaterialProgress', materialProgressSchema);
module.exports = MaterialProgress;
