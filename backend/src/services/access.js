const { ApiError } = require('../middleware/errorHandler');
const Classroom = require('../models/Classroom');
const Enrollment = require('../models/Enrollment');
const BatchJoinCode = require('../models/BatchJoinCode');
const StudentEnrollment = require('../models/StudentEnrollment');
const TeachingGroup = require('../models/TeachingGroup');
const sameId = (a, b) => Boolean(a && b && String(a._id || a) === String(b._id || b));
const isStaff = user => ['admin', 'teacher', 'professor'].includes(user?.role);

async function assertAccountAccess(user) {
  if (!user || !user.isActive) throw new ApiError(401, 'UNAUTHORIZED', 'Account is unavailable');
  if (user.role !== 'student') return;
  const active = await StudentEnrollment.find({ studentId: user._id, status: 'Active' }).select('teachingGroupId').lean();
  if (active.length && await TeachingGroup.exists({ _id: { $in: active.map(e => e.teachingGroupId) }, loginEnabled: false })) {
    throw new ApiError(403, 'LOGIN_REVOKED', 'Batch access is suspended. Contact administration.');
  }
  // Normalized enrollment is authoritative. Historical legacy classrooms must
  // not suspend a student who has already advanced to a different batch.
  if (active.length) return;
  const enrollments = await Enrollment.find({ studentId: user._id }).populate('classroomId', 'session classBatch labBatch teachingGroupId').lean();
  const scopes = enrollments.filter(e => e.classroomId?.classBatch && !e.classroomId.teachingGroupId).map(e => ({
    session: e.classroomId.session, classBatch: e.classroomId.classBatch,
    labBatch: { $in: [null, e.classroomId.labBatch || null] },
  }));
  if (scopes.length && await BatchJoinCode.exists({ loginEnabled: false, teachingGroupId: null, deletedAt: null, $or: scopes })) {
    throw new ApiError(403, 'LOGIN_REVOKED', 'Batch access is suspended. Contact administration.');
  }
}

async function classroomAccess(classroomId, user, write = false) {
  const classroom = await Classroom.findById(classroomId?._id || classroomId).populate('courseId');
  if (!classroom || !classroom.courseId) throw new ApiError(404, 'NOT_FOUND', 'Classroom not found');
  const isOwner = sameId(classroom.professorId, user._id);
  if (write && !isStaff(user)) throw new ApiError(403, 'FORBIDDEN', 'Staff access required');
  if (user.role === 'student') {
    if (!classroom.isActive || !await Enrollment.exists({ classroomId: classroom._id, studentId: user._id, deletedAt: null })) {
      throw new ApiError(403, 'FORBIDDEN', 'Not enrolled in this classroom');
    }
  } else if (!isStaff(user) || (!isOwner && user.role !== 'admin')) {
    throw new ApiError(403, 'FORBIDDEN', 'Not authorized for this classroom');
  }
  return { classroom, course: classroom.courseId, isOwner };
}
module.exports = { sameId, isStaff, assertAccountAccess, classroomAccess };
