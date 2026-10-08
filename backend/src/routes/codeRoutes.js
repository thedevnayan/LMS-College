const express = require('express');
const { runCode, submitCode } = require('../controllers/codeController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Routes can be used by both logged-in students and guests (QR)

router.post('/run', runCode);
router.post('/submit/:testId/:questionId', submitCode);

module.exports = router;
