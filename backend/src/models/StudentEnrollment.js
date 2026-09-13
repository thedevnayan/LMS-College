const mongoose = require('mongoose');

const studentEnrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
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
    teachingGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeachingGroup',
      required: [true, 'Teaching group / batch is required'],
    },
    status: {
      type: String,
      enum: ['Active', 'Promoted', 'Completed', 'Detained', 'Dropped'],
      default: 'Active',
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    promotedAt: {
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

// One student enrollment per academic session and academic period
studentEnrollmentSchema.index(
  { studentId: 1, academicSessionId: 1, academicPeriodId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

studentEnrollmentSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('StudentEnrollment', studentEnrollmentSchema);
