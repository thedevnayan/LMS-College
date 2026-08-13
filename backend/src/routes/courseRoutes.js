const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const courseController = require('../controllers/courseController');

const router = express.Router();

const courseValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
];

router.use(protect); // All routes require authentication

router.route('/')
  .get(courseController.getCourses)
  .post(authorize('professor'), validate(courseValidation), courseController.createCourse);

router.route('/:id')
  .get(courseController.getCourseById)
  .patch(authorize('professor'), courseController.updateCourse)
  .delete(authorize('professor'), courseController.deleteCourse);

router.post('/:id/publish', authorize('professor'), courseController.publishCourse);
router.post('/:id/enroll', authorize('student'), courseController.enrollCourse);
router.get('/:id/students', authorize('professor'), courseController.getCourseStudents);
// GET /api/courses/:id/enrollments is the same as students essentially, but spec mentions it explicitly.
// We'll point it to the same controller function.
router.get('/:id/enrollments', authorize('professor'), courseController.getCourseStudents);

module.exports = router;
