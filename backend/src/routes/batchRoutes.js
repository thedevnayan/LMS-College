const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const batchController = require('../controllers/batchController');

const router = express.Router({ mergeParams: true });

router.use(protect);
router.use(authorize('professor')); // All batch routes are professor-only

// Nested routes: /api/courses/:courseId/batches
router.route('/')
  .get(batchController.getCourseBatches)
  .post(
    validate([
      body('name').trim().notEmpty().withMessage('Batch name is required'),
    ]),
    batchController.createBatch
  );

// Direct routes: /api/batches/:id
router.route('/:id')
  .get(batchController.getBatchById)
  .patch(batchController.updateBatch)
  .delete(batchController.deleteBatch);

router.post(
  '/:id/assign',
  validate([
    body('studentIds').isArray().withMessage('studentIds must be an array'),
  ]),
  batchController.assignStudents
);

router.delete('/:id/students/:studentId', batchController.unassignStudent);

module.exports = router;
