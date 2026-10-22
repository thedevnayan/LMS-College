const { ApiError } = require('../middleware/errorHandler');
function assertSubmissionWindow(assignment, now = Date.now()) {
  if (['draft', 'archived'].includes(assignment.status)) throw new ApiError(409, 'ASSIGNMENT_CLOSED', 'Assignment is not open');
  if (now < +new Date(assignment.startDate)) throw new ApiError(409, 'NOT_STARTED', 'Assignment has not opened');
  if (now > +new Date(assignment.dueDate) && !assignment.allowLate) throw new ApiError(409, 'DEADLINE_PASSED', 'Assignment deadline has passed');
}
function validateAnswers(assignment, answers) {
  if (!assignment.questions?.length) return;
  if (!Array.isArray(answers) || answers.length !== assignment.questions.length || answers.some((answer, i) => answer !== null && (!Number.isInteger(answer) || answer < 0 || answer >= assignment.questions[i].options.length))) throw new ApiError(400, 'INVALID_ANSWERS', 'Provide one valid option or null per question');
}
function gradeAnswers(assignment, answers) {
  validateAnswers(assignment, answers);
  const weights = assignment.questions.map(q => Number.isFinite(q.marks) && q.marks >= 0 ? q.marks : 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const earned = weights.reduce((sum, weight, i) => sum + (answers[i] === assignment.questions[i].correctOptionIndex ? weight : 0), 0);
  return total ? Math.round(earned / total * assignment.maxMarks * 100) / 100 : 0;
}
module.exports = { assertSubmissionWindow, validateAnswers, gradeAnswers };
