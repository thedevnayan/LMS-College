const asyncHandler = require('../utils/asyncHandler');
const { executeCode } = require('../utils/codeExecutor');
const unavailable = asyncHandler(async () => executeCode());
module.exports = { runCode: unavailable, submitCode: unavailable };
