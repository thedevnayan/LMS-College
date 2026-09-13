const mongoose = require('mongoose');

const teachingGroupSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program is required'],
    },
    cohortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdmissionCohort',
      required: [true, 'Cohort is required'],
    },
    academicSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session is required'],
    },
    academicPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicPeriod',
      required: [true, 'Academic period is required'],
    },
    name: {
      type: String,
      required: [true, 'Batch/Group name is required'],
      trim: true,
      // e.g. "Batch A", "Section B"
    },
    capacity: {
      type: Number,
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

teachingGroupSchema.index(
  { academicSessionId: 1, programId: 1, academicPeriodId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

teachingGroupSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('TeachingGroup', teachingGroupSchema);
