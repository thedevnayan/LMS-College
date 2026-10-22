const { ApiError } = require('../middleware/errorHandler');
// No host execution. See docs/production.md for isolated judge prerequisites.
async function executeCode() {
  throw new ApiError(503, 'JUDGE_UNAVAILABLE', 'Coding execution requires an isolated judge and is currently unavailable.');
}
module.exports = { executeCode };
