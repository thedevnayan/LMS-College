const mongoose = require('mongoose');

const practicalGroupSchema = new mongoose.Schema(
  {
    teachingGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeachingGroup',
      required: [true, 'Teaching group is required'],
    },
    courseOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOffering',
      default: null, // If null, general practical sub-batch under teaching group; otherwise course-specific lab
    },
    name: {
      type: String,
      required: [true, 'Practical group name is required'],
      trim: true,
      // e.g. "Practical A1", "Programming Lab A1"
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

practicalGroupSchema.index(
  { teachingGroupId: 1, courseOfferingId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

practicalGroupSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('PracticalGroup', practicalGroupSchema);
