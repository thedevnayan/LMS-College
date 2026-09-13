const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const academicController = require('../controllers/academicController');

const router = express.Router();

router.use(protect);

// Institutions
router.route('/institutions')
  .get(academicController.getInstitutions)
  .post(authorize('admin'), academicController.createInstitution);

// Departments
router.route('/departments')
  .get(academicController.getDepartments)
  .post(authorize('admin'), academicController.createDepartment);

// Programs
router.route('/programs')
  .get(academicController.getPrograms)
  .post(authorize('admin'), academicController.createProgram);

// Academic Sessions
router.route('/sessions')
  .get(academicController.getAcademicSessions)
  .post(authorize('admin'), academicController.createAcademicSession);

router.route('/sessions/:id')
  .patch(authorize('admin'), academicController.updateAcademicSession);

// Academic Periods
router.route('/periods')
  .get(academicController.getAcademicPeriods);

// Admission Cohorts
router.route('/cohorts')
  .get(academicController.getAdmissionCohorts)
  .post(authorize('admin'), academicController.createAdmissionCohort);

// Teaching Groups (Batches)
router.route('/batches')
  .get(academicController.getTeachingGroups)
  .post(authorize('admin', 'professor'), academicController.createTeachingGroup);

// Practical Groups
router.route('/practical-groups')
  .post(authorize('admin', 'professor'), academicController.createPracticalGroup);

// Course Offerings
router.route('/offerings')
  .get(academicController.getCourseOfferings)
  .post(authorize('admin', 'professor'), academicController.createCourseOffering);

// Student Enrollment
router.route('/enroll')
  .post(authorize('admin', 'professor'), academicController.enrollStudent);

// Session Rollover & Promotion
router.route('/rollover')
  .post(authorize('admin'), academicController.rolloverSession);

module.exports = router;
