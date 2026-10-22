const express = require('express');
const router = express.Router({ mergeParams: true }); // Important for nested routes like /classrooms/:classroomId/tests
const testController = require('../controllers/testController');
const { protect, authorize } = require('../middleware/auth');

// --- Public/Guest Routes ---

router.post('/join-guest', testController.joinGuestTest);
router.get('/session/:sessionToken/state', testController.getGuestLiveState);

// --- Protected Routes ---
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
  .post(authorize('professor'), (req, res, next) => {
    if (req.params.classroomId) {
      return testController.createTest(req, res, next);
    }
    res.status(400).json({ success: false, message: 'Classroom ID required to create test' });
  });

router.route('/join/:code')
  .get(testController.verifyJoinCode);

router.route('/:id/join-code')
  .patch(authorize('professor'), testController.generateJoinCode);

router.route('/:id/live-state')
  .get(authorize('professor'), testController.getLiveState);

router.route('/:id/my-attempt')
  .get(testController.getMyAttempt);

router.get('/:id/my-report', authorize('student'), testController.getMyReport);

router.route('/:id/report')
  .get(authorize('professor'), testController.getTestReport);

router.route('/:id')
  .get(testController.getTestById)
  .patch(testController.updateTest)
  .delete(authorize('professor'), testController.deleteTest);

module.exports = router;
