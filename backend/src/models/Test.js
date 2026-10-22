const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: true }
});

const questionSchema = new mongoose.Schema({
  questionType: {
    type: String,
    enum: ['mcq', 'coding'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    default: 1, min: 0, max: 10000
  },
  // For MCQ
  options: [{ type: String }],
  correctOptionIndex: { type: Number },
  
  // For Coding
  codingLanguage: { 
    type: String, 
    default: 'javascript'
  },
  codingTemplate: { type: String, default: '' },
  testCases: [testCaseSchema]
});

const testSchema = new mongoose.Schema(
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
    availableFrom: { type: Date, default: null },
    availableUntil: { type: Date, default: null },
    questionTimeLimitSeconds: { type: Number, default: 30, min: 5, max: 3600 },
    fastestBonusPoints: { type: Number, default: 10, min: 0, max: 10000 },
    questionReleasedAt: { type: Date, default: null },
    questionDeadlineAt: { type: Date, default: null },
    answerSequence: { type: Number, default: 0 },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    testType: {
      type: String,
      enum: ['standard', 'time-based', 'live-fastest-finger', 'live-round-robin'],
      default: 'standard',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'active', 'completed'],
      default: 'draft',
    },
    joinCode: {
      type: String,
      sparse: true,
      unique: true
    },
    liveStatus: {
      type: String,
      enum: ['waiting', 'in-progress', 'ended'],
      default: 'waiting'
    },
    // In minutes. Applies if testType is 'time-based'
    timeLimit: {
      type: Number,
      default: 0, min: 0, max: 1440,
    },
    // New additions for secure QR sessions and server authoritative timers
    sessionToken: {
      type: String,
      sparse: true,
      unique: true
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    // Server-side live test state (survives disconnections)
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    turnUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Track who has answered the current question in fastest-finger to prevent double answers
    answeredCurrentQuestion: [{
      type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String(guestId)
    }],
    questions: [questionSchema],
  },
  {
    timestamps: true,
  }
);

// Auto-generate sessionToken before first save
testSchema.pre('validate', function () {
  if (!this.sessionToken) {
    this.sessionToken = uuidv4();
  }
});

testSchema.index({ classroomId: 1, status: 1, createdAt: -1 });
testSchema.pre('validate', function () {
  if (this.availableFrom && this.availableUntil && this.availableFrom >= this.availableUntil) this.invalidate('availableUntil', 'Closing time must follow opening time');
  if (this.questions.length > 200) this.invalidate('questions', 'Maximum 200 questions');
  if (['published', 'active'].includes(this.status) && !this.questions.length) this.invalidate('questions', 'Add questions before publishing');
  for (const q of this.questions) {
    if (q.questionType === 'mcq' && (q.options.length < 2 || q.options.length > 10 || !Number.isInteger(q.correctOptionIndex) || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length)) this.invalidate('questions', 'MCQs require options and a valid answer key');
    if (q.questionType === 'coding' && ['published', 'active'].includes(this.status)) this.invalidate('questions', 'Coding assessments cannot be published without an isolated judge');
  }
});
module.exports = mongoose.model('Test', testSchema);
