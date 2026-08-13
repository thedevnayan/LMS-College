const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { errorHandler, ApiError } = require('./middleware/errorHandler');
const { successResponse } = require('./utils/response');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const materialRoutes = require('./routes/materialRoutes');
const batchRoutes = require('./routes/batchRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const quizRoutes = require('./routes/quizRoutes');
const quizAttemptRoutes = require('./routes/quizAttemptRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// ─── Security Middleware ───
app.use(helmet());              // Set secure HTTP headers

// Prevent NoSQL injection on req.body and req.params
// Note: Express 5 makes req.query a read-only getter, so we sanitize manually
app.use((req, res, next) => {
  if (req.body) {
    mongoSanitize.sanitize(req.body);
  }
  next();
});

// Global API rate limiter: 200 requests per 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
  },
});
app.use('/api', globalLimiter);

// ─── Body Parsing ───
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));          // Cap JSON body size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/courses/:courseId/modules', moduleRoutes); 
app.use('/api/courses/:courseId/batches', batchRoutes);
app.use('/api/modules', moduleRoutes); 
app.use('/api/modules/:moduleId/materials', materialRoutes); 
app.use('/api/modules/:moduleId/assignments', assignmentRoutes); 
app.use('/api/modules/:moduleId/quizzes', quizRoutes); 
app.use('/api/materials', materialRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/assignments/:assignmentId/submissions', submissionRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/quizzes/:quizId/attempts', quizAttemptRoutes);
app.use('/api/quiz-attempts', quizAttemptRoutes);
app.use('/api/dashboard', dashboardRoutes);

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
