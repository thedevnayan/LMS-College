const mongoose = require('mongoose');

const curriculumSchema = new mongoose.Schema(
  {
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
    defaultTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    credits: {
      type: Number,
      default: 4,
      min: 1,
      max: 20,
    },
    classification: {
      type: String,
      enum: ['theory', 'practical', 'both'],
      default: 'both',
    },
    isElective: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
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

// Prevent duplicate courses in the same semester of a program
curriculumSchema.index(
  { programId: 1, academicPeriodId: 1, courseId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

curriculumSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('Curriculum', curriculumSchema);
