const express = require('express');
// Preload and register all domain models
require('./models');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler, ApiError } = require('./middleware/errorHandler');
const { successResponse } = require('./utils/response');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const materialRoutes = require('./routes/materialRoutes');
const testRoutes = require('./routes/testRoutes');
const batchRoutes = require('./routes/batchRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const quizRoutes = require('./routes/quizRoutes');
const quizAttemptRoutes = require('./routes/quizAttemptRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const aiRoutes = require('./routes/aiRoutes');
const studentRoutes = require('./routes/studentRoutes');
const codeRoutes = require('./routes/codeRoutes');
const academicRoutes = require('./routes/academicRoutes');
const misRoutes = require('./routes/misRoutes');
const enrollRoutes = require('./routes/enrollRoutes');

const app = express();

// ─── Security Middleware ───
app.use(helmet());              // Set secure HTTP headers

app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
app.use(cors({ origin: require('./config/security').corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(cookieParser());
// Reject operator/path keys rather than silently changing request meaning.
app.use((req, res, next) => {
  const unsafe = value => value && typeof value === 'object' && Object.entries(value).some(([key, v]) => key.startsWith('$') || key.includes('.') || ['__proto__', 'constructor', 'prototype'].includes(key) || unsafe(v));
  if (unsafe(req.body) || unsafe(req.query)) return next(new ApiError(400, 'INVALID_INPUT', 'Invalid input keys'));
  next();
});
// Coarse anonymous abuse ceiling. Protected routes have a separate per-user quota.
app.use('/api', rateLimit({ windowMs: 60_000, limit: 20000, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/api/ready', (req, res) => {
  const ready = require('mongoose').connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ success: ready, data: { status: ready ? 'ready' : 'unavailable' } });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/enroll', enrollRoutes);
app.use('/api/users', userRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/mis', misRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/courses/:courseId/modules', moduleRoutes); 
app.use('/api/courses/:courseId/batches', batchRoutes);
app.use('/api/modules', moduleRoutes); 
app.use('/api/classrooms/:classroomId/materials', materialRoutes); 
app.use('/api/classrooms/:classroomId/tests', testRoutes);
app.use('/api/modules/:moduleId/quizzes', quizRoutes); 
app.use('/api/classrooms/:classroomId/assignments', assignmentRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/assignments/:assignmentId/submissions', submissionRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/quizzes/:quizId/attempts', quizAttemptRoutes);
app.use('/api/quiz-attempts', quizAttemptRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/code', codeRoutes);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json(successResponse({ status: 'ok' }, 'Server is healthy'));
});

// 404 handler
app.use((req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Route ${req.originalUrl} not found`));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
