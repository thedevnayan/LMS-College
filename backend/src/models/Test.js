const mongoose = require('mongoose');

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
    default: 1
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
      required: true,
    },
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
      default: 0, 
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
    questions: [questionSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Test', testSchema);
