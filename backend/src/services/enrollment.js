const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const BatchJoinCode = require('../models/BatchJoinCode');
const TeachingGroup = require('../models/TeachingGroup');
const PracticalGroup = require('../models/PracticalGroup');
const CourseOffering = require('../models/CourseOffering');
const StudentEnrollment = require('../models/StudentEnrollment');
const CourseMembership = require('../models/CourseMembership');
const Enrollment = require('../models/Enrollment');
const AcademicSession = require('../models/AcademicSession');
const { ApiError } = require('../middleware/errorHandler');
const { sameId } = require('./access');

async function resolveInvitation(token, session) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 128) throw new ApiError(404, 'INVALID_TOKEN', 'Invalid enrollment invitation');
  let invite = await BatchJoinCode.findOne({ enrollmentToken: token }).session(session || null);
  let classroom = null;
  if (!invite) { classroom = await Classroom.findOne({ enrollmentToken: token }).session(session || null); invite = classroom; }
  if (!invite || !invite.isActive) throw new ApiError(404, 'INVALID_TOKEN', 'Invitation is invalid or revoked');
  const expiry = classroom ? invite.enrollmentExpiresAt : invite.expiresAt;
  if (!expiry || +expiry <= Date.now()) throw new ApiError(410, 'INVITATION_EXPIRED', 'Invitation expired; ask an administrator to renew it');
  const offering = classroom && await CourseOffering.findById(classroom.courseOfferingId).session(session || null);
  const groupId = classroom ? offering?.teachingGroupId : invite.teachingGroupId;
  const group = groupId && await TeachingGroup.findById(groupId).session(session || null);
  if (!group) throw new ApiError(409, 'INVITATION_UNMAPPED', 'Invitation needs an administrator to map its academic batch');
  const blocked = await BatchJoinCode.exists({ teachingGroupId: group._id, loginEnabled: false, deletedAt: null }).session(session || null);
  if (invite.loginEnabled === false || group.loginEnabled === false || blocked) throw new ApiError(403, 'LOGIN_REVOKED', 'Batch access is suspended');
  const offerings = await CourseOffering.find({ teachingGroupId: group._id, status: 'Active' }).session(session || null);
  const classrooms = await Classroom.find(classroom ? { _id: classroom._id, isActive: true } : { courseOfferingId: { $in: offerings.map(o => o._id) }, isActive: true }).session(session || null);
  if (!classrooms.length) throw new ApiError(409, 'NO_CLASSROOMS', 'No active classrooms are available for this invitation');
  const labs = await PracticalGroup.find({ _id: { $in: classrooms.map(c => c.practicalGroupId).filter(Boolean) }, teachingGroupId: group._id }).session(session || null);
  return { invite, classroom, group, offerings, classrooms, labs };
}
async function enrollStudent(scope, user, requestedLab, session) {
  const { invite, group, offerings } = scope;
  const current = await StudentEnrollment.findOne({ studentId: user._id, academicSessionId: group.academicSessionId, academicPeriodId: group.academicPeriodId }).session(session);
  if (current && (!sameId(current.teachingGroupId, group._id) || current.status !== 'Active')) throw new ApiError(403, 'INELIGIBLE_BATCH', 'Student already belongs to another batch or has progressed');
  // An empty roster is a shared QR invitation. Explicit rosters stay restricted.
  const restricted = (invite.allowedEmails || []).length > 0;
  if (!current && restricted && !invite.allowedEmails.includes(user.email.toLowerCase())) throw new ApiError(403, 'INVITATION_NOT_ASSIGNED', 'This invitation is not assigned to your account. Contact administration.');
  if (!current && restricted && !user.enrollmentApproved) throw new ApiError(403, 'IDENTITY_APPROVAL_REQUIRED', 'Register an account and ask administration to verify your identity before using an assigned invitation.');
  let chosenLab = scope.classroom?.practicalGroupId || invite.practicalGroupId;
  if (!chosenLab && requestedLab) chosenLab = scope.labs.find(l => sameId(l._id, requestedLab) || l.name.toUpperCase() === String(requestedLab).toUpperCase())?._id;
  if (scope.labs.length && !chosenLab) throw new ApiError(400, 'LAB_REQUIRED', 'Select a permitted lab group');
  if (chosenLab && !scope.labs.some(l => sameId(l._id, chosenLab))) throw new ApiError(403, 'INVALID_LAB', 'Lab does not belong to this invitation');
  const academicSession = await AcademicSession.findById(group.academicSessionId).session(session);
  if (!academicSession || academicSession.status === 'Completed') throw new ApiError(409, 'SESSION_CLOSED', 'Academic session is closed');
  // Lock the group against concurrent enrollment, suspension and capacity writes.
  await TeachingGroup.updateOne({ _id: group._id }, { $inc: { enrollmentRevision: 1 } }, { session });
  if (!current && group.capacity && await StudentEnrollment.countDocuments({ teachingGroupId: group._id, status: 'Active', deletedAt: null }).session(session) >= group.capacity) throw new ApiError(409, 'BATCH_FULL', 'Batch capacity reached');
  const enrollment = current || (await StudentEnrollment.create([{
    studentId: user._id, institutionId: academicSession.institutionId, programId: group.programId, cohortId: group.cohortId,
    academicSessionId: group.academicSessionId, academicPeriodId: group.academicPeriodId, teachingGroupId: group._id,
  }], { session }))[0];
  const classes = scope.classrooms.filter(c => c.type === 'theory' || sameId(c.practicalGroupId, chosenLab));
  for (const c of classes) {
    const existing = await Enrollment.findOne({ studentId: user._id, classroomId: c._id }).session(session);
    await Classroom.updateOne({ _id: c._id }, { $inc: { enrollmentRevision: 1 } }, { session });
    if (!existing && c.maxStudents && await Enrollment.countDocuments({ classroomId: c._id, deletedAt: null }).session(session) >= c.maxStudents) throw new ApiError(409, 'CLASSROOM_FULL', 'Classroom capacity reached');
    if (!existing) await Enrollment.create([{ studentId: user._id, classroomId: c._id, courseId: c.courseId, labBatch: c.labBatch }], { session });
    const offering = offerings.find(o => sameId(o._id, c.courseOfferingId));
    if (!offering) throw new ApiError(409, 'INVALID_OFFERING', 'Classroom offering is not active');
    const member = await CourseMembership.findOne({ studentId: user._id, courseOfferingId: offering._id }).session(session);
    if (member?.practicalGroupId && chosenLab && !sameId(member.practicalGroupId, chosenLab)) throw new ApiError(409, 'LAB_LOCKED', 'Contact administration to change lab groups');
    await CourseMembership.updateOne({ studentId: user._id, courseOfferingId: offering._id }, { $setOnInsert: { studentEnrollmentId: enrollment._id, teachingGroupId: group._id }, ...(c.type === 'lab' ? { $set: { practicalGroupId: c.practicalGroupId } } : {}) }, { upsert: true, session, runValidators: true });
  }
  return { isBatch: !scope.classroom, batch: group.name, enrolledCount: classes.length, classrooms: classes.map(c => ({ classroomId: c._id, type: c.type, labBatch: c.labBatch })) };
}
module.exports = { resolveInvitation, enrollStudent };
