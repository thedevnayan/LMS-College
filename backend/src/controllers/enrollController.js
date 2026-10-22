const mongoose = require('mongoose');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');
const { resolveInvitation, enrollStudent } = require('../services/enrollment');
const { assertAccountAccess } = require('../services/access');
const { issueSession } = require('../services/tokens');
const getTokenInfo = asyncHandler(async (req,res) => {
  const scope = await resolveInvitation(req.params.token);
  res.json(successResponse({ type: scope.classroom ? 'classroom' : 'batch', classBatch: scope.group.name, session: scope.invite.session, totalClasses: scope.classrooms.length, requiresLabSelection: scope.labs.length > 0 && !scope.classroom?.practicalGroupId && !scope.invite.practicalGroupId, availableLabBatches: scope.labs.map(l => l.name) }));
});
const enrollWithToken = asyncHandler(async (req,res) => {
  await resolveInvitation(req.params.token); // No account or session created for invalid invitations.
  const { name, password, isNewAccount } = req.body;
  const email = req.body.email.toLowerCase();
  let user = await User.findOne({ email });
  if (isNewAccount && user) throw new ApiError(409, 'EMAIL_EXISTS', 'Account exists; please sign in');
  if (!isNewAccount && (!user || !await user.matchPassword(password))) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  if (user) {
    if (user.role !== 'student') throw new ApiError(403, 'FORBIDDEN', 'Only students can enroll');
    await assertAccountAccess(user);
  }
  const result = await mongoose.connection.transaction(async session => {
    const scope = await resolveInvitation(req.params.token, session);
    const student = isNewAccount ? (await User.create([{ name, email, password, role: 'student' }], { session }))[0] : user;
    const data = await enrollStudent(scope, student, req.body.labBatch, session);
    return { student, data };
  });
  const accessToken = await issueSession(result.student, res);
  res.status(201).json(successResponse({ ...result.data, user: result.student, accessToken }, 'Enrollment completed'));
});
module.exports = { getTokenInfo, enrollWithToken };
