const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
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
batchSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 604800 });

// Prevent duplicate batch names within the same course, ignoring soft-deleted ones
batchSchema.index(
  { courseId: 1, name: 1 }, 
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

batchSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null });
  next();
});

// Soft-deleting a batch shouldn't cascade-delete enrollments, 
// it should just unassign students from the batch (batchId = null).
// However, since it's a soft-delete, we probably shouldn't structurally alter the enrollments right away 
// (what if we want to restore the batch?), but the spec says "unassigns students". 
// To strictly unassign students so they don't break the UI (since the batch is gone), we will nullify it.
batchSchema.pre('save', async function (next) {
  if (this.isModified('deletedAt') && this.deletedAt !== null) {
    const Enrollment = mongoose.model('Enrollment');
    await Enrollment.updateMany({ batchId: this._id }, { batchId: null });
  }
  next();
});

const Batch = mongoose.model('Batch', batchSchema);
module.exports = Batch;
