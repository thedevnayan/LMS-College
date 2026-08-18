const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const aiController = require('../controllers/aiController');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

const router = express.Router();

const generateValidation = [
  body('topic').notEmpty().withMessage('Topic is required'),
  body('count').optional().isInt({ min: 1, max: 20 }).withMessage('Count must be between 1 and 20'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Difficulty must be easy, medium, or hard')
];

router.post(
  '/generate-questions',
  protect,
  authorize('professor'),
  validate(generateValidation),
  aiController.generateQuestions
);

module.exports = router;
