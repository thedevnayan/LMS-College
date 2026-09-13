const mongoose = require('mongoose');

const admissionCohortSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution is required'],
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program is required'],
    },
    name: {
      type: String,
      required: [true, 'Cohort name is required'],
      trim: true,
      // e.g. "BCA 2026-29"
    },
    startYear: {
      type: Number,
      required: [true, 'Start year is required'],
      // e.g. 2026
    },
    endYear: {
      type: Number,
      required: [true, 'End year is required'],
      // e.g. 2029
    },
    status: {
      type: String,
      enum: ['Active', 'Graduated', 'Archived'],
      default: 'Active',
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

admissionCohortSchema.index({ programId: 1, name: 1 }, { unique: true });

admissionCohortSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('AdmissionCohort', admissionCohortSchema);
