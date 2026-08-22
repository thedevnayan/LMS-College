const express = require('express');
const { getTeacherStudents, getStudentProfile } = require('../controllers/studentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getTeacherStudents);
router.get('/:id/performance', getStudentProfile);

module.exports = router;
