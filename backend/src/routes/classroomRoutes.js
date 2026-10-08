const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const classroomController = require('../controllers/classroomController');

const router = express.Router();

const createClassroomValidation = [
  body('courseId').notEmpty().withMessage('Course ID is required'),
  body('session').trim().notEmpty().withMessage('Session is required (e.g. 2025-2026)'),
  body('classBatch').trim().notEmpty().withMessage('Class batch is required (e.g. A, B, C)'),
  body('type').isIn(['theory', 'lab']).withMessage('Type must be "theory" or "lab"'),
];

const joinValidation = [
  body('joinCode')
    .trim()
    .isLength({ min: 4, max: 16 })
    .withMessage('Join code must be between 4 and 16 characters'),
];

router.use(protect); // All routes require authentication

// Batch join codes for single-code onboarding
router.get('/batch-codes', classroomController.getBatchCodes);
router.patch('/batch-codes/:id/toggle-login', authorize('admin', 'professor'), classroomController.toggleBatchLogin);

// Student join route (must be before /:id routes)
router.post('/join', authorize('student'), validate(joinValidation), classroomController.joinClassroom);

// Professor and Student routes
router.route('/')
  .get(classroomController.getClassrooms)
  .post(authorize('professor', 'admin'), validate(createClassroomValidation), classroomController.createClassroom);

router.route('/:id')
  .get(classroomController.getClassroomById)
  .patch(authorize('professor'), classroomController.updateClassroom)
  .delete(authorize('professor'), classroomController.deleteClassroom);

router.get('/:id/students', authorize('professor'), classroomController.getClassroomStudents);
router.post('/:id/regenerate-code', authorize('professor'), classroomController.regenerateCode);

module.exports = router;
