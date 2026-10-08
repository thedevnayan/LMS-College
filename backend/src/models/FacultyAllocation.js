const mongoose = require('mongoose');

const facultyAllocationSchema = new mongoose.Schema(
  {
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
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    teachingGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeachingGroup',
      required: [true, 'Teaching group (Batch) is required'],
    },
    type: {
      type: String,
      enum: ['theory', 'lab'],
      required: [true, 'Type (theory or lab) is required'],
    },
    practicalGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PracticalGroup',
      default: null, // Null for theory; populated for lab e.g. B1, B2
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty / Instructor is required'],
    },
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

// One faculty allocation per (session, course, batch, type, practical group)
facultyAllocationSchema.index(
  { academicSessionId: 1, courseId: 1, teachingGroupId: 1, type: 1, practicalGroupId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

facultyAllocationSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('FacultyAllocation', facultyAllocationSchema);
