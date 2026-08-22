const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const assignmentController = require('../controllers/assignmentController');

const router = express.Router({ mergeParams: true });

router.use(protect);

router.route('/')
  .get((req, res, next) => {
    if (req.params.classroomId) {
      return assignmentController.getAssignments(req, res, next);
    }
    return assignmentController.getAllAssignmentsForProfessor(req, res, next);
  })
  .post(
    authorize('professor'),
    validate([
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('dueDate').isISO8601().withMessage('Valid due date is required'),
      body('maxMarks').isNumeric().withMessage('Max marks is required'),
    ]),
    assignmentController.createAssignment
  );

router.route('/:id')
  .get(assignmentController.getAssignmentById)
  .patch(authorize('professor'), assignmentController.updateAssignment)
  .delete(authorize('professor'), assignmentController.deleteAssignment);

router.get('/:id/submissions', authorize('professor'), assignmentController.getAssignmentSubmissions);
router.post('/:id/submit', authorize('student'), assignmentController.submitAssignment);

module.exports = router;
