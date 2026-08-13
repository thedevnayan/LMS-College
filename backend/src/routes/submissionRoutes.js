const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const submissionController = require('../controllers/submissionController');

const router = express.Router({ mergeParams: true });

router.use(protect);

// Nested: /api/assignments/:assignmentId/submissions
router.post(
  '/',
  authorize('student'),
  validate([
    body('fileUrl').isURL().withMessage('Valid file URL is required'),
  ]),
  submissionController.submitAssignment
);

// Direct: /api/submissions/:id
router.get('/:id', submissionController.getSubmissionById);

router.patch(
  '/:id/grade',
  authorize('professor'),
  validate([
    body('marks').isNumeric().withMessage('Marks must be a number'),
  ]),
  submissionController.gradeSubmission
);

module.exports = router;
