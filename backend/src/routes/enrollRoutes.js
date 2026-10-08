const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { validate } = require('../middleware/validate');
const enrollController = require('../controllers/enrollController');

const router = express.Router();

// Rate limiting for enrollment (prevent brute-force token guessing)
const enrollLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per window
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many enrollment attempts from this IP, please try again after 15 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation for enrollment submission
const enrollValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// GET  /api/enroll/:token — Public, returns batch/classroom info
router.get('/:token', enrollController.getTokenInfo);

// POST /api/enroll/:token — Public, authenticates and enrolls the student
router.post(
  '/:token',
  enrollLimiter,
  validate(enrollValidation),
  enrollController.enrollWithToken
);

module.exports = router;
