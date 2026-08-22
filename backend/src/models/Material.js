const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true,
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
    url: {
      type: String,
      required: [true, 'File URL is required'],
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

materialSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 604800 });

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

const Material = mongoose.model('Material', materialSchema);
module.exports = Material;
