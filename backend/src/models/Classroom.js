const mongoose = require('mongoose');
const crypto = require('crypto');

const classroomSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    session: {
      type: String,
      required: [true, 'Session is required'],
      trim: true,
      // e.g. "2025-2026"
    },
    classBatch: {
      type: String,
      required: [true, 'Class batch is required'],
      trim: true,
      uppercase: true,
      // e.g. "A", "B", "C"
    },
    type: {
      type: String,
      enum: ['theory', 'lab'],
      required: [true, 'Type (theory/lab) is required'],
    },
    labBatch: {
      type: String,
      default: null,
      // e.g. "B1" for classBatch "B" when type is "lab"
    },
    joinCode: {
      type: String,
      unique: true,
      uppercase: true,
      // 6-char alphanumeric, auto-generated
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxStudents: {
      type: Number,
      default: null, // unlimited if null
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// TTL Index for soft deletes
classroomSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 604800 });

// Compound index: one classroom per course+session+batch+type+labBatch (prevents duplicates)
classroomSchema.index(
  { courseId: 1, session: 1, classBatch: 1, type: 1, labBatch: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

// Pre-find hook to exclude soft-deleted items
classroomSchema.pre(/^find/, function () {
  this.where({ deletedAt: null });
});

/**
 * Generate a random 6-character alphanumeric code (uppercase)
 */
function generateCode() {
  // Use characters that are unambiguous (no 0/O, 1/I/L confusion)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Auto-generate join code before saving (if not already set)
 */
classroomSchema.pre('validate', async function () {
  if (!this.joinCode) {
    // Retry up to 10 times in case of collision
    const Classroom = mongoose.model('Classroom');
    let code;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
      // Check if code already exists
      const existing = await Classroom.findOne({ joinCode: code }).lean();
      if (!existing) break;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Failed to generate a unique join code. Please try again.');
    }
    this.joinCode = code;
  }
});

/**
 * Clear labBatch if type is theory
 */
classroomSchema.pre('validate', function () {
  if (this.type === 'theory') {
    this.labBatch = null;
  }
});

// Expose the generateCode function for the controller (regenerate code)
classroomSchema.statics.generateJoinCode = generateCode;

const Classroom = mongoose.model('Classroom', classroomSchema);
module.exports = Classroom;
