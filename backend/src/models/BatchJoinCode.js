const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const batchJoinCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    enrollmentToken: {
      type: String,
      unique: true,
      index: true,
      // Auto-generated UUID — used in QR code URLs for secure enrollment
    },
    session: {
      type: String,
      required: [true, 'Session is required (e.g. 2028-29)'],
      trim: true,
    },
    classBatch: {
      type: String,
      required: [true, 'Class batch is required (e.g. B)'],
      uppercase: true,
      trim: true,
    },
    labBatch: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
      // e.g. "B1" or null for whole batch master code
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
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
    isActive: {
      type: Boolean,
      default: true,
    },
    loginEnabled: {
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

batchJoinCodeSchema.index(
  { session: 1, classBatch: 1, labBatch: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

batchJoinCodeSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

// Auto-generate enrollmentToken before first save
batchJoinCodeSchema.pre('validate', function () {
  if (!this.enrollmentToken) {
    this.enrollmentToken = uuidv4();
  }
});

// Static: look up an active batch code by its enrollment token
batchJoinCodeSchema.statics.findByToken = function (token) {
  return this.findOne({ enrollmentToken: token, isActive: true, deletedAt: null });
};

module.exports = mongoose.model('BatchJoinCode', batchJoinCodeSchema);

