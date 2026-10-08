const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

const updateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('avatarUrl').optional().isURL().withMessage('Avatar must be a valid URL'),
];

router.use(protect); // All user routes require authentication

router.route('/')
  .post(validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['admin', 'professor', 'teacher', 'student']).withMessage('Invalid role'),
  ]), userController.createUser);

router.route('/:id')
  .get(userController.getUserById)
  .patch(validate(updateValidation), userController.updateUser);

module.exports = router;
