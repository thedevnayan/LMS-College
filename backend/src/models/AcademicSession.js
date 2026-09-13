const mongoose = require('mongoose');

const academicSessionSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution is required'],
    },
    name: {
      type: String,
      required: [true, 'Session name is required'],
      trim: true,
      // e.g. "2026-27"
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: ['Upcoming', 'Active', 'Completed', 'Archived'],
      default: 'Upcoming',
    },
    isCurrent: {
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
  }
);

academicSessionSchema.index({ institutionId: 1, name: 1 }, { unique: true });

academicSessionSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('AcademicSession', academicSessionSchema);
