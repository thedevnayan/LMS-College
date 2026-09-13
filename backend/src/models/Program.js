const mongoose = require('mongoose');

const programSchema = new mongoose.Schema(
  {
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Institution is required'],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Program name is required'],
      trim: true,
      // e.g. "Bachelor of Computer Applications"
    },
    code: {
      type: String,
      required: [true, 'Program code is required'],
      uppercase: true,
      trim: true,
      // e.g. "BCA"
    },
    degreeType: {
      type: String,
      enum: ['Undergraduate', 'Postgraduate', 'Diploma', 'Doctorate', 'Certificate'],
      default: 'Undergraduate',
    },
    durationYears: {
      type: Number,
      default: 3,
      min: 1,
      max: 6,
    },
    totalPeriods: {
      type: Number,
      default: 6,
      min: 1,
      max: 12,
      // e.g. 6 semesters
    },
    periodType: {
      type: String,
      enum: ['Semester', 'Year', 'Trimester', 'Term'],
      default: 'Semester',
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

programSchema.index({ institutionId: 1, code: 1 }, { unique: true });

programSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('Program', programSchema);
