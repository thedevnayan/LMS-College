const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const quizController = require('../controllers/quizController');

const router = express.Router({ mergeParams: true });

router.use(protect);

router.route('/')
  .get(quizController.getQuizzes)
  .post(
    authorize('professor'),
    validate([
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('duration').isNumeric().withMessage('Duration is required'),
      body('questions').isArray().withMessage('Questions must be an array'),
    ]),
    quizController.createQuiz
  );

// Full must come before /:id to not be treated as an ID
router.get('/:id/full', authorize('professor'), quizController.getQuizFull);

router.route('/:id')
  .get(quizController.getQuizById)
  .patch(authorize('professor'), quizController.updateQuiz)
  .delete(authorize('professor'), quizController.deleteQuiz);

module.exports = router;
