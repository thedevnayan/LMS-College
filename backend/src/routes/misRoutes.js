const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const misController = require('../controllers/misController');

const router = express.Router();

router.use(protect);

// Institutional Overview
router.get('/overview', authorize('admin'), misController.getOverview);

// Program Analytics
router.get('/programs/:programId', authorize('admin'), misController.getProgramAnalytics);

// Course Offering Analytics
router.get('/courses/:offeringId', authorize('admin'), misController.getCourseAnalytics);

// Batch-Level Analytics
router.get('/batches/:batchId', authorize('admin'), misController.getBatchAnalytics);

// Student Academic Profile, Multi-Session History & Activity Timeline
// Authenticated students can view self; Admin & Professor can view any student
router.get('/students/:studentId', misController.getStudentHistoryAndTimeline);

// Multi-Session Comparative Analytics
router.get('/compare-sessions', authorize('admin'), misController.compareSessions);

// Global Academic Search
router.get('/search', authorize('admin'), misController.globalAcademicSearch);

// Report CSV Exports
router.get('/reports/export', authorize('admin'), misController.exportReport);

module.exports = router;
