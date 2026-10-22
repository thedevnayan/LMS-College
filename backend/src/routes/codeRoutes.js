const express = require('express');
const { runCode, submitCode } = require('../controllers/codeController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/run', runCode);
router.post('/submit/:testId/:questionId', submitCode);

module.exports = router;
