const mongoose = require('mongoose');

const courseMembershipSchema = new mongoose.Schema(
  {
    studentEnrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentEnrollment',
      required: [true, 'Student enrollment is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    courseOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOffering',
      required: [true, 'Course offering is required'],
    },
    teachingGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeachingGroup',
      required: [true, 'Teaching group is required'],
    },
    practicalGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PracticalGroup',
      default: null,
    },
    status: {
      type: String,
      enum: ['Enrolled', 'Completed', 'Dropped'],
      default: 'Enrolled',
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

courseMembershipSchema.index(
  { studentId: 1, courseOfferingId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

courseMembershipSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('CourseMembership', courseMembershipSchema);
