const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const misController = require('../controllers/misController');

const router = express.Router();

router.use(protect);

// Institutional Overview
router.get('/overview', authorize('admin', 'professor'), misController.getOverview);

// Program Analytics
router.get('/programs/:programId', authorize('admin', 'professor'), misController.getProgramAnalytics);

// Course Offering Analytics
router.get('/courses/:offeringId', authorize('admin', 'professor'), misController.getCourseAnalytics);

// Batch-Level Analytics
router.get('/batches/:batchId', authorize('admin', 'professor'), misController.getBatchAnalytics);

// Student Academic Profile, Multi-Session History & Activity Timeline
// Authenticated students can view self; Admin & Professor can view any student
router.get('/students/:studentId', misController.getStudentHistoryAndTimeline);

// Multi-Session Comparative Analytics
router.get('/compare-sessions', authorize('admin', 'professor'), misController.compareSessions);

// Global Academic Search
router.get('/search', authorize('admin', 'professor'), misController.globalAcademicSearch);

// Report CSV Exports
router.get('/reports/export', authorize('admin', 'professor'), misController.exportReport);

module.exports = router;
