const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const quizAttemptController = require('../controllers/quizAttemptController');

const router = express.Router({ mergeParams: true });

router.use(protect);

// Nested: /api/quizzes/:quizId/attempts
router.post('/', authorize('student'), quizAttemptController.startAttempt);

// Direct: /api/quiz-attempts/:id
router.patch('/:id', authorize('student'), quizAttemptController.autosaveAttempt);
router.post('/:id/submit', authorize('student'), quizAttemptController.submitAttempt);

module.exports = router;
