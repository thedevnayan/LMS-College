const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      default: null, // Backward-compat
    },
    courseOfferingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseOffering',
      default: null,
    },
    academicSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      default: null,
    },
    academicPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicPeriod',
      default: null,
    },
    teachingGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeachingGroup',
      default: null,
    },
    practicalGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PracticalGroup',
      default: null,
    },
    topic: {
      type: String,
      required: [true, 'Material topic is required'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Material title is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['pdf', 'video', 'text', 'link', 'presentation', 'image'],
      required: [true, 'Material type is required'],
    },
    storage: { publicId: String, format: String, mime: String, bytes: Number, originalName: String },
    images: [{ publicId: String, format: String, mime: String, bytes: Number, originalName: String }],
    url: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
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


materialSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

// Cascade soft-delete to MaterialProgress
materialSchema.pre('save', async function () {
  if (this.isModified('deletedAt') && this.deletedAt !== null) {
    const MaterialProgress = mongoose.model('MaterialProgress');
    await MaterialProgress.updateMany({ materialId: this._id }, { deletedAt: this.deletedAt });
  }
});

materialSchema.index({ classroomId: 1, createdAt: -1 });
const Material = mongoose.model('Material', materialSchema);
module.exports = Material;
