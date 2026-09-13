const mongoose = require('mongoose');

const courseOfferingSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    academicSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session is required'],
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program is required'],
    },
    academicPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicPeriod',
      required: [true, 'Academic period is required'],
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    primaryTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Primary teacher is required'],
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Active', 'Completed'],
      default: 'Active',
    },
    // Backward-compatibility bridge to existing Classroom if mapped
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
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

// One offering per course + academic session + program + academic period
courseOfferingSchema.index(
  { courseId: 1, academicSessionId: 1, programId: 1, academicPeriodId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

courseOfferingSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('CourseOffering', courseOfferingSchema);
