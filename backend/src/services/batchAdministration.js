const mongoose = require('mongoose');
const { randomBytes, randomUUID } = require('node:crypto');
const BatchJoinCode = require('../models/BatchJoinCode');
const TeachingGroup = require('../models/TeachingGroup');
const Classroom = require('../models/Classroom');
const Enrollment = require('../models/Enrollment');
const StudentEnrollment = require('../models/StudentEnrollment');
const AuditLog = require('../models/AuditLog');
const { ApiError } = require('../middleware/errorHandler');

async function listInvitations(sessionName) {
  const groups = await TeachingGroup.find().populate('academicSessionId', 'name').limit(200);
  const result = [];
  for (const group of groups) {
    if (!group.academicSessionId || (sessionName && group.academicSessionId.name !== sessionName)) continue;
    const classes = await Classroom.find({ teachingGroupId: group._id }).populate('courseId', 'title');
    let invitation = await BatchJoinCode.findOne({ teachingGroupId: group._id, labBatch: null });
    if (!invitation) {
      invitation = await BatchJoinCode.findOneAndUpdate({ teachingGroupId: group._id, labBatch: null }, { $setOnInsert: {
        code: randomBytes(8).toString('hex'), enrollmentToken: randomUUID(), session: group.academicSessionId.name,
        classBatch: group.name.toUpperCase(), programId: group.programId, expiresAt: new Date(Date.now() + 7 * 86400000),
      } }, { upsert: true, returnDocument: 'after', runValidators: true });
    }
    result.push({ session: invitation.session, classBatch: group.name, masterCode: invitation.code, masterCodeId: invitation._id,
      masterEnrollmentToken: invitation.enrollmentToken, loginEnabled: group.loginEnabled !== false && invitation.loginEnabled !== false,
      expiresAt: invitation.expiresAt, allowedEmails: invitation.allowedEmails, teachingGroupId: group._id,
      theoryClassesCount: classes.filter(c => c.type === 'theory').length, labClassesCount: classes.filter(c => c.type === 'lab').length,
      totalTheoryCourses: classes.filter(c => c.type === 'theory').map(c => c.courseId?.title), subBatches: [] });
  }
  return result;
}
async function setBatchAccess(ids, enabled, actor) {
  if (actor.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Administrator access required');
  if (!Array.isArray(ids) || !ids.length || ids.length > 100 || typeof enabled !== 'boolean') throw new ApiError(400, 'INVALID_INPUT', 'Supply batch code IDs and an explicit loginEnabled boolean');
  const result = await mongoose.connection.transaction(async session => {
    const changed = [];
    for (const id of [...new Set(ids)]) {
      const invite = await BatchJoinCode.findById(id).session(session);
      if (!invite) throw new ApiError(404, 'NOT_FOUND', 'Batch invitation not found');
      invite.loginEnabled = enabled; await invite.save({ session });
      if (invite.teachingGroupId) await TeachingGroup.updateOne({ _id: invite.teachingGroupId }, { $set: { loginEnabled: enabled } }, { session });
      await AuditLog.create([{ actorId: actor._id, actorName: actor.name, actorRole: actor.role, action: 'BATCH_ACCESS_CHANGED', entity: 'BatchJoinCode', entityId: String(id), metadata: { loginEnabled: enabled } }], { session });
      changed.push({ id, teachingGroupId: invite.teachingGroupId, session: invite.session, classBatch: invite.classBatch, loginEnabled: enabled });
    }
    return changed;
  });
  if (!enabled) {
    // Disconnect active test and notification sockets immediately after commit.
    const students = await StudentEnrollment.distinct('studentId', { teachingGroupId: { $in: result.map(r => r.teachingGroupId).filter(Boolean) }, status: 'Active', deletedAt: null });
    const legacy = result.filter(r => !r.teachingGroupId);
    if (legacy.length) {
      const classes = await Classroom.find({ $or: legacy.map(r => ({ session: r.session, classBatch: r.classBatch })) }).select('_id');
      students.push(...await Enrollment.distinct('studentId', { classroomId: { $in: classes.map(c => c._id) }, deletedAt: null }));
    }
    try {
      const io = require('../sockets/testSocket').getIo();
      for (const id of students) { io.to('user_' + id).emit('access_revoked', { message: 'Batch access suspended' }); io.in('user_' + id).disconnectSockets(true); }
    } catch {}
  }
  return result;
}
async function updateInvitation(id, body, actor) {
  if (actor.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Administrator access required');
  if (!Array.isArray(body.allowedEmails) || body.allowedEmails.length > 1000 || body.allowedEmails.some(e => typeof e !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) throw new ApiError(400, 'INVALID_INPUT', 'Provide an eligible email roster');
  const expiresAt = new Date(body.expiresAt);
  if (!Number.isFinite(+expiresAt) || +expiresAt <= Date.now() || +expiresAt > Date.now() + 90 * 86400000) throw new ApiError(400, 'INVALID_INPUT', 'Expiry must be within the next 90 days');
  return mongoose.connection.transaction(async session => {
    const invite = await BatchJoinCode.findById(id).session(session);
    if (!invite?.teachingGroupId) throw new ApiError(409, 'INVITATION_UNMAPPED', 'Map the academic batch before renewing');
    invite.allowedEmails = [...new Set(body.allowedEmails.map(e => e.trim().toLowerCase()))];
    invite.expiresAt = expiresAt; invite.isActive = body.isActive !== false;
    if (body.rotate === true) invite.enrollmentToken = randomUUID();
    await invite.save({ session });
    await AuditLog.create([{ actorId: actor._id, actorRole: actor.role, actorName: actor.name, action: 'INVITATION_UPDATED', entity: 'BatchJoinCode', entityId: String(id), metadata: { eligibleCount: invite.allowedEmails.length, expiresAt, rotated: body.rotate === true } }], { session });
    return invite;
  });
}
module.exports = { listInvitations, setBatchAccess, updateInvitation };
