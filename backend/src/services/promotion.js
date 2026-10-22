const mongoose = require('mongoose');
const TeachingGroup = require('../models/TeachingGroup');
const AcademicPeriod = require('../models/AcademicPeriod');
const AcademicSession = require('../models/AcademicSession');
const StudentEnrollment = require('../models/StudentEnrollment');
const CourseOffering = require('../models/CourseOffering');
const CourseMembership = require('../models/CourseMembership');
const Classroom = require('../models/Classroom');
const Enrollment = require('../models/Enrollment');
const Curriculum = require('../models/Curriculum');
const AuditLog = require('../models/AuditLog');
const { ApiError } = require('../middleware/errorHandler');
const { sameId } = require('./access');

function validateProgression(source, fromPeriod, toPeriod, targetSession) {
  if (!source || !fromPeriod || !toPeriod || !targetSession || targetSession.status === 'Completed') throw new ApiError(400, 'INVALID_DESTINATION', 'Choose an active destination session and semester');
  if (!sameId(source.programId, toPeriod.programId) || toPeriod.periodNumber !== fromPeriod.periodNumber + 1) throw new ApiError(400, 'INVALID_PROGRESSION', 'Promotion must advance exactly one semester in the same program');
}
async function promote(body, actor, session) {
  const source = await TeachingGroup.findById(body.sourceBatchId).session(session);
  if (!source) throw new ApiError(404, 'NOT_FOUND', 'Source batch not found');
  const fromPeriod = await AcademicPeriod.findById(source.academicPeriodId).session(session);
  const toPeriod = await AcademicPeriod.findById(body.targetPeriodId).session(session);
  const targetSession = await AcademicSession.findById(body.targetSessionId).session(session);
  const sourceSession = await AcademicSession.findById(source.academicSessionId).session(session);
  validateProgression(source, fromPeriod, toPeriod, targetSession);
  if (!sameId(sourceSession?.institutionId, targetSession.institutionId) || +targetSession.startDate < +sourceSession.startDate) throw new ApiError(400, 'INVALID_DESTINATION', 'Destination institution/session is inconsistent');
  if ((body.targetProgramId && !sameId(body.targetProgramId, source.programId)) || (body.targetCohortId && !sameId(body.targetCohortId, source.cohortId))) throw new ApiError(400, 'INVALID_DESTINATION', 'Promotion preserves program and admission cohort');
  const filter = { teachingGroupId: source._id, status: 'Active' };
  if (body.selectedStudentIds !== undefined) {
    if (!Array.isArray(body.selectedStudentIds) || !body.selectedStudentIds.length) throw new ApiError(400, 'NO_STUDENTS', 'Select at least one eligible student');
    filter.studentId = { $in: body.selectedStudentIds };
  }
  if (body.excludedStudentIds?.length) filter.studentId = { ...filter.studentId, $nin: body.excludedStudentIds };
  const students = await StudentEnrollment.find(filter).session(session);
  if (!students.length) throw new ApiError(409, 'ALREADY_PROMOTED', 'No eligible active students remain');
  if (body.selectedStudentIds && students.length !== new Set(body.selectedStudentIds).size) throw new ApiError(409, 'INELIGIBLE_STUDENT', 'Selection contains unavailable or already promoted students');
  let target;
  if (body.targetBatchId && body.targetBatchId !== 'NEW') target = await TeachingGroup.findById(body.targetBatchId).session(session);
  else {
    const scope = { academicSessionId: targetSession._id, programId: source.programId, academicPeriodId: toPeriod._id, name: body.targetBatchName || source.name };
    target = await TeachingGroup.findOne(scope).session(session);
    if (!target) target = (await TeachingGroup.create([{ ...scope, cohortId: source.cohortId }], { session }))[0];
  }
  if (!target || !sameId(target.programId, source.programId) || !sameId(target.cohortId, source.cohortId) || !sameId(target.academicSessionId, targetSession._id) || !sameId(target.academicPeriodId, toPeriod._id)) throw new ApiError(400, 'INVALID_DESTINATION', 'Target batch does not match destination semester and cohort');
  await TeachingGroup.updateOne({ _id: target._id }, { $inc: { enrollmentRevision: 1 } }, { session });
  if (target.capacity && students.length + await StudentEnrollment.countDocuments({ teachingGroupId: target._id, status: 'Active', deletedAt: null }).session(session) > target.capacity) throw new ApiError(409, 'BATCH_FULL', 'Destination capacity exceeded');
  let offerings = await CourseOffering.find({ teachingGroupId: target._id, status: 'Active' }).session(session);
  if (!offerings.length) {
    const curriculum = await Curriculum.find({ programId: source.programId, academicPeriodId: toPeriod._id }).populate('courseId').session(session);
    if (!curriculum.length) throw new ApiError(409, 'MISSING_CURRICULUM', 'Configure destination subjects and teachers before promotion');
    for (const subject of curriculum) {
      const teacher = subject.defaultTeacherId || subject.courseId?.professorId;
      if (!subject.courseId || !teacher) throw new ApiError(409, 'MISSING_TEACHER', 'Assign destination subject teachers first');
      offerings.push((await CourseOffering.create([{ courseId: subject.courseId._id, academicSessionId: targetSession._id, programId: source.programId, academicPeriodId: toPeriod._id, teachingGroupId: target._id, primaryTeacherId: teacher, status: 'Active' }], { session }))[0]);
    }
  }
  const classrooms = [];
  for (const offering of offerings) {
    let classroom = await Classroom.findOne({ courseOfferingId: offering._id, type: 'theory', isActive: true }).session(session);
    if (classroom) classrooms.push(classroom);
  }
  const results = [];
  for (const old of students) {
    const moved = await StudentEnrollment.updateOne({ _id: old._id, status: 'Active' }, { $set: { status: 'Promoted', promotedAt: new Date() } }, { session });
    if (moved.modifiedCount !== 1) throw new ApiError(409, 'ALREADY_PROMOTED', 'Student was already promoted');
    const next = (await StudentEnrollment.create([{ studentId: old.studentId, institutionId: old.institutionId, programId: source.programId, cohortId: source.cohortId, academicSessionId: targetSession._id, academicPeriodId: toPeriod._id, teachingGroupId: target._id }], { session }))[0];
    for (const classroom of classrooms) {
      await CourseMembership.create([{ studentEnrollmentId: next._id, studentId: old.studentId, courseOfferingId: classroom.courseOfferingId, teachingGroupId: target._id }], { session });
      await Enrollment.create([{ studentId: old.studentId, classroomId: classroom._id, courseId: classroom.courseId }], { session });
    }
    results.push({ studentId: old.studentId, newEnrollmentId: next._id });
  }
  await AuditLog.create([{ actorId: actor._id, actorName: actor.name, actorRole: actor.role, action: 'BATCH_PROMOTED', entity: 'TeachingGroup', entityId: String(target._id), metadata: { sourceBatchId: source._id, students: results.map(r => r.studentId), promotedCount: results.length } }], { session });
  return results;
}
async function promoteBatch(body, actor) {
  if (body.confirmed !== true) throw new ApiError(400, 'CONFIRMATION_REQUIRED', 'Confirm the promotion before submitting');
  return mongoose.connection.transaction(session => promote(body, actor, session));
}
async function rolloverSession(body, actor) {
  if (body.confirmed !== true) throw new ApiError(400, 'CONFIRMATION_REQUIRED', 'Confirm the session rollover');
  const startDate = new Date(body.newStartDate), endDate = new Date(body.newEndDate);
  if (!body.newSessionName || !Number.isFinite(+startDate) || !Number.isFinite(+endDate) || startDate >= endDate) throw new ApiError(400, 'INVALID_DATES', 'Provide a session name and valid start/end dates');
  return mongoose.connection.transaction(async session => {
    const current = await AcademicSession.findById(body.currentSessionId).session(session);
    if (!current || current.status === 'Completed') throw new ApiError(409, 'SESSION_CLOSED', 'Source session is already completed or unavailable');
    if (body.promotions?.length) throw new ApiError(400, 'USE_BATCH_PROMOTION', 'Promote selected students through the batch promotion workflow');
    const next = (await AcademicSession.create([{ institutionId: current.institutionId, name: body.newSessionName, startDate, endDate, status: 'Active', isCurrent: true }], { session }))[0];
    const results = [];
    for (const spec of body.batchPromotions || []) {
      const group = await TeachingGroup.findById(spec.sourceBatchId).session(session);
      if (!sameId(group?.academicSessionId, current._id)) throw new ApiError(400, 'INVALID_SOURCE', 'Source batch must belong to the closing session');
      results.push(...await promote({ ...spec, targetSessionId: next._id }, actor, session));
    }
    current.status = 'Completed'; current.isCurrent = false; await current.save({ session });
    await AcademicSession.updateMany({ _id: { $ne: next._id }, institutionId: current.institutionId }, { $set: { isCurrent: false } }, { session });
    await AuditLog.create([{ actorId: actor._id, actorName: actor.name, actorRole: actor.role, action: 'SESSION_ROLLOVER', entity: 'AcademicSession', entityId: String(next._id), metadata: { fromSession: current._id, promotedCount: results.length } }], { session });
    return { completedSession: current, newActiveSession: next, promotions: results };
  });
}
module.exports = { validateProgression, promoteBatch, rolloverSession };
