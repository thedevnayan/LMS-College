const express = require('express');
const router = express.Router({ mergeParams: true }); // Important for nested routes like /classrooms/:classroomId/tests
const testController = require('../controllers/testController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get((req, res, next) => {
    // If mounted at /classrooms/:classroomId/tests
    if (req.params.classroomId) {
      return testController.getTests(req, res, next);
    }
    // If mounted at /tests
    return testController.getAllTestsForProfessor(req, res, next);
  })
  .post((req, res, next) => {
    if (req.params.classroomId) {
      return testController.createTest(req, res, next);
    }
    res.status(400).json({ success: false, message: 'Classroom ID required to create test' });
  });

router.route('/join/:code')
  .get(testController.verifyJoinCode);

router.route('/:id/join-code')
  .patch(testController.generateJoinCode);

router.route('/:id/live-state')
  .get(testController.getLiveState);

router.route('/:id/my-attempt')
  .get(testController.getMyAttempt);

router.route('/:id')
  .get(testController.getTestById)
  .patch(testController.updateTest)
  .delete(testController.deleteTest);

module.exports = router;
