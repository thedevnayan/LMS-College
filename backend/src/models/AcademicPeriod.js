const mongoose = require('mongoose');

const academicPeriodSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program is required'],
    },
    periodNumber: {
      type: Number,
      required: [true, 'Period number is required'],
      // e.g. 1, 2, 3...
    },
    name: {
      type: String,
      required: [true, 'Period name is required'],
      trim: true,
      // e.g. "Semester 1", "Year 1"
    },
    isActive: {
      type: Boolean,
      default: true,
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

academicPeriodSchema.index({ programId: 1, periodNumber: 1 }, { unique: true });

academicPeriodSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('AcademicPeriod', academicPeriodSchema);
