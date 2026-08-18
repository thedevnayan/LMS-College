const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null, // Nullable until assigned by professor
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      default: null, // Set when student joins via classroom code
    },
    labBatch: {
      type: String,
      default: null, // e.g. "A1" — assigned by professor for lab classrooms
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
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
enrollmentSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 604800 });

// Ensure a student can only enroll in a course once (ignores soft-deleted ones theoretically, 
// but to be safe we'll use a partial index if MongoDB supports it, or handle in code.
// Given standard index:
enrollmentSchema.index(
  { studentId: 1, courseId: 1 }, 
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

enrollmentSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
module.exports = Enrollment;
