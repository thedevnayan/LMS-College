const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.use(protect);

router.get('/student', authorize('student'), dashboardController.getStudentDashboard);
router.get('/professor', authorize('professor'), dashboardController.getProfessorDashboard);

module.exports = router;
