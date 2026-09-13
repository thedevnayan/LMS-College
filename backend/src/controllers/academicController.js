const mongoose = require('mongoose');
const Institution = require('../models/Institution');
const Department = require('../models/Department');
const Program = require('../models/Program');
const AcademicSession = require('../models/AcademicSession');
const AcademicPeriod = require('../models/AcademicPeriod');
const AdmissionCohort = require('../models/AdmissionCohort');
const CourseOffering = require('../models/CourseOffering');
const TeachingGroup = require('../models/TeachingGroup');
const PracticalGroup = require('../models/PracticalGroup');
const StudentEnrollment = require('../models/StudentEnrollment');
const CourseMembership = require('../models/CourseMembership');
const Course = require('../models/Course');
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');
const { logAudit } = require('../utils/auditService');

// ─── INSTITUTIONS ───
const getInstitutions = asyncHandler(async (req, res) => {
  const institutions = await Institution.find().sort({ createdAt: -1 });
  res.status(200).json(successResponse(institutions));
});

const createInstitution = asyncHandler(async (req, res, next) => {
  const { name, code, address, contactEmail, website } = req.body;
  if (!name || !code) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Name and code are required'));
  }
  const inst = await Institution.create({ name, code: code.toUpperCase(), address, contactEmail, website });
  await logAudit({ actor: req.user, action: 'INSTITUTION_CREATED', entity: 'Institution', entityId: inst._id, metadata: { name, code } });
  res.status(201).json(successResponse(inst, 'Institution created successfully'));
});

// ─── DEPARTMENTS ───
const getDepartments = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.institutionId) query.institutionId = req.query.institutionId;
  const depts = await Department.find(query).populate('headOfDepartment', 'name email').sort({ name: 1 });
  res.status(200).json(successResponse(depts));
});

const createDepartment = asyncHandler(async (req, res, next) => {
  const { institutionId, name, code, headOfDepartment } = req.body;
  if (!name || !code) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Name and code are required'));
  }
  let instId = institutionId;
  if (!instId) {
    const inst = await Institution.findOne();
    if (!inst) return next(new ApiError(400, 'NOT_FOUND', 'Please create an institution first'));
    instId = inst._id;
  }
  const dept = await Department.create({ institutionId: instId, name, code: code.toUpperCase(), headOfDepartment });
  await logAudit({ actor: req.user, action: 'DEPARTMENT_CREATED', entity: 'Department', entityId: dept._id, metadata: { name, code } });
  res.status(201).json(successResponse(dept, 'Department created successfully'));
});

// ─── PROGRAMS ───
const getPrograms = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.departmentId) query.departmentId = req.query.departmentId;
  const programs = await Program.find(query).populate('departmentId', 'name code').sort({ name: 1 });
  res.status(200).json(successResponse(programs));
});

const createProgram = asyncHandler(async (req, res, next) => {
  const { institutionId, departmentId, name, code, degreeType, durationYears, totalPeriods, periodType } = req.body;
  if (!name || !code) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Name and code are required'));
  }
  let instId = institutionId;
  if (!instId) {
    const inst = await Institution.findOne();
    instId = inst?._id;
  }
  const program = await Program.create({
    institutionId: instId,
    departmentId: departmentId || null,
    name,
    code: code.toUpperCase(),
    degreeType: degreeType || 'Undergraduate',
    durationYears: durationYears || 3,
    totalPeriods: totalPeriods || 6,
    periodType: periodType || 'Semester',
  });

  // Automatically create academic periods (e.g. Semester 1 to N)
  const periodsToCreate = program.totalPeriods || 6;
  for (let i = 1; i <= periodsToCreate; i++) {
    await AcademicPeriod.create({
      programId: program._id,
      periodNumber: i,
      name: `${program.periodType} ${i}`,
    });
  }

  await logAudit({ actor: req.user, action: 'PROGRAM_CREATED', entity: 'Program', entityId: program._id, metadata: { name, code } });
  res.status(201).json(successResponse(program, 'Program and periods created successfully'));
});

// ─── ACADEMIC SESSIONS ───
const getAcademicSessions = asyncHandler(async (req, res) => {
  const sessions = await AcademicSession.find().sort({ startDate: -1 });
  res.status(200).json(successResponse(sessions));
});

const createAcademicSession = asyncHandler(async (req, res, next) => {
  const { institutionId, name, startDate, endDate, status } = req.body;
  if (!name || !startDate || !endDate) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Name, startDate, and endDate are required'));
  }
  let instId = institutionId;
  if (!instId) {
    const inst = await Institution.findOne();
    instId = inst?._id;
  }
  const session = await AcademicSession.create({
    institutionId: instId,
    name,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    status: status || 'Upcoming',
    isCurrent: status === 'Active',
  });

  if (session.isCurrent) {
    await AcademicSession.updateMany({ _id: { $ne: session._id } }, { isCurrent: false });
  }

  await logAudit({ actor: req.user, action: 'ACADEMIC_SESSION_CREATED', entity: 'AcademicSession', entityId: session._id, metadata: { name, status } });
  res.status(201).json(successResponse(session, 'Academic session created successfully'));
});

const updateAcademicSession = asyncHandler(async (req, res, next) => {
  const session = await AcademicSession.findById(req.params.id);
  if (!session) return next(new ApiError(404, 'NOT_FOUND', 'Session not found'));

  const { name, startDate, endDate, status, isCurrent } = req.body;
  if (name) session.name = name;
  if (startDate) session.startDate = new Date(startDate);
  if (endDate) session.endDate = new Date(endDate);

  if (status && ['Upcoming', 'Active', 'Completed', 'Archived'].includes(status)) {
    session.status = status;
    if (status === 'Active') {
      session.isCurrent = true;
      await AcademicSession.updateMany({ _id: { $ne: session._id } }, { isCurrent: false });
    }
  }

  if (typeof isCurrent === 'boolean') {
    session.isCurrent = isCurrent;
    if (isCurrent) {
      await AcademicSession.updateMany({ _id: { $ne: session._id } }, { isCurrent: false });
    }
  }

  await session.save();
  await logAudit({ actor: req.user, action: 'ACADEMIC_SESSION_UPDATED', entity: 'AcademicSession', entityId: session._id, metadata: { status: session.status } });
  res.status(200).json(successResponse(session, 'Academic session updated'));
});

// ─── ACADEMIC PERIODS ───
const getAcademicPeriods = asyncHandler(async (req, res, next) => {
  const query = {};
  if (req.query.programId) query.programId = req.query.programId;
  const periods = await AcademicPeriod.find(query).sort({ periodNumber: 1 });
  res.status(200).json(successResponse(periods));
});

// ─── ADMISSION COHORTS ───
const getAdmissionCohorts = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.programId) query.programId = req.query.programId;
  const cohorts = await AdmissionCohort.find(query).populate('programId', 'name code').sort({ startYear: -1 });
  res.status(200).json(successResponse(cohorts));
});

const createAdmissionCohort = asyncHandler(async (req, res, next) => {
  const { programId, name, startYear, endYear } = req.body;
  if (!programId || !name || !startYear || !endYear) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Program, name, startYear, and endYear are required'));
  }
  const program = await Program.findById(programId);
  if (!program) return next(new ApiError(404, 'NOT_FOUND', 'Program not found'));

  const cohort = await AdmissionCohort.create({
    institutionId: program.institutionId,
    programId,
    name,
    startYear: Number(startYear),
    endYear: Number(endYear),
    status: 'Active',
  });
  await logAudit({ actor: req.user, action: 'COHORT_CREATED', entity: 'AdmissionCohort', entityId: cohort._id, metadata: { name } });
  res.status(201).json(successResponse(cohort, 'Admission cohort created successfully'));
});

// ─── TEACHING GROUPS (BATCHES) & PRACTICAL GROUPS ───
const getTeachingGroups = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.academicSessionId) query.academicSessionId = req.query.academicSessionId;
  if (req.query.programId) query.programId = req.query.programId;
  if (req.query.academicPeriodId) query.academicPeriodId = req.query.academicPeriodId;

  const groups = await TeachingGroup.find(query)
    .populate('programId', 'name code')
    .populate('academicPeriodId', 'name periodNumber')
    .populate('academicSessionId', 'name status')
    .sort({ name: 1 });

  const groupsWithDetails = await Promise.all(
    groups.map(async (g) => {
      const practicalGroups = await PracticalGroup.find({ teachingGroupId: g._id });
      const studentCount = await StudentEnrollment.countDocuments({ teachingGroupId: g._id, status: 'Active' });
      return {
        ...g.toObject(),
        practicalGroups,
        studentCount,
      };
    })
  );

  res.status(200).json(successResponse(groupsWithDetails));
});

const createTeachingGroup = asyncHandler(async (req, res, next) => {
  const { programId, cohortId, academicSessionId, academicPeriodId, name, practicalSubBatches } = req.body;
  if (!programId || !cohortId || !academicSessionId || !academicPeriodId || !name) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'All academic structure fields are required'));
  }

  const tg = await TeachingGroup.create({
    programId,
    cohortId,
    academicSessionId,
    academicPeriodId,
    name,
  });

  const createdPracticalGroups = [];
  if (Array.isArray(practicalSubBatches) && practicalSubBatches.length > 0) {
    for (const pName of practicalSubBatches) {
      if (pName && pName.trim()) {
        const pg = await PracticalGroup.create({
          teachingGroupId: tg._id,
          name: pName.trim(),
        });
        createdPracticalGroups.push(pg);
      }
    }
  }

  await logAudit({ actor: req.user, action: 'BATCH_CREATED', entity: 'TeachingGroup', entityId: tg._id, metadata: { name, practicalCount: createdPracticalGroups.length } });
  res.status(201).json(successResponse({ ...tg.toObject(), practicalGroups: createdPracticalGroups }, 'Batch created successfully'));
});

// ─── PRACTICAL GROUPS ───
const createPracticalGroup = asyncHandler(async (req, res, next) => {
  const { teachingGroupId, name, courseOfferingId } = req.body;
  if (!teachingGroupId || !name) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Teaching group ID and name are required'));
  }
  const pg = await PracticalGroup.create({
    teachingGroupId,
    name: name.trim(),
    courseOfferingId: courseOfferingId || null,
  });
  await logAudit({ actor: req.user, action: 'PRACTICAL_GROUP_CREATED', entity: 'PracticalGroup', entityId: pg._id, metadata: { name } });
  res.status(201).json(successResponse(pg, 'Practical group created successfully'));
});

// ─── COURSE OFFERINGS ───
const getCourseOfferings = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.academicSessionId) query.academicSessionId = req.query.academicSessionId;
  if (req.query.programId) query.programId = req.query.programId;
  if (req.query.academicPeriodId) query.academicPeriodId = req.query.academicPeriodId;
  if (req.query.teacherId) query.primaryTeacherId = req.query.teacherId;

  const offerings = await CourseOffering.find(query)
    .populate('courseId', 'title code credits classification thumbnail')
    .populate('programId', 'name code')
    .populate('academicPeriodId', 'name periodNumber')
    .populate('academicSessionId', 'name status')
    .populate('primaryTeacherId', 'name email')
    .populate('classroomId', 'joinCode classBatch type labBatch')
    .sort({ createdAt: -1 });

  res.status(200).json(successResponse(offerings));
});

const createCourseOffering = asyncHandler(async (req, res, next) => {
  const { courseId, academicSessionId, programId, academicPeriodId, departmentId, primaryTeacherId } = req.body;
  if (!courseId || !academicSessionId || !programId || !academicPeriodId || !primaryTeacherId) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Course, session, program, period, and teacher are required'));
  }

  const existing = await CourseOffering.findOne({ courseId, academicSessionId, programId, academicPeriodId });
  if (existing) {
    return next(new ApiError(409, 'CONFLICT', 'A course offering for this course, session, and period already exists'));
  }

  const offering = await CourseOffering.create({
    courseId,
    academicSessionId,
    programId,
    academicPeriodId,
    departmentId: departmentId || null,
    primaryTeacherId,
    status: 'Active',
  });

  await logAudit({ actor: req.user, action: 'COURSE_OFFERING_CREATED', entity: 'CourseOffering', entityId: offering._id, metadata: { courseId } });
  res.status(201).json(successResponse(offering, 'Course offering created successfully'));
});

// ─── STUDENT ENROLLMENT & ASSIGNMENT ───
const enrollStudent = asyncHandler(async (req, res, next) => {
  const { studentId, institutionId, programId, cohortId, academicSessionId, academicPeriodId, teachingGroupId, practicalGroupId, courseOfferingIds } = req.body;

  if (!studentId || !programId || !cohortId || !academicSessionId || !academicPeriodId || !teachingGroupId) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Missing required enrollment parameters'));
  }

  let instId = institutionId;
  if (!instId) {
    const inst = await Institution.findOne();
    instId = inst?._id;
  }

  // Check if active enrollment already exists for this student in this session + period
  let enrollment = await StudentEnrollment.findOne({ studentId, academicSessionId, academicPeriodId });
  if (enrollment) {
    // Update existing active enrollment in current context
    enrollment.teachingGroupId = teachingGroupId;
    enrollment.status = 'Active';
    await enrollment.save();
  } else {
    // Create new historical enrollment record!
    enrollment = await StudentEnrollment.create({
      studentId,
      institutionId: instId,
      programId,
      cohortId,
      academicSessionId,
      academicPeriodId,
      teachingGroupId,
      status: 'Active',
    });
  }

  // Assign to course offerings
  const targetOfferings = Array.isArray(courseOfferingIds) && courseOfferingIds.length > 0
    ? courseOfferingIds
    : await CourseOffering.find({ academicSessionId, programId, academicPeriodId }).select('_id');

  const createdMemberships = [];
  for (const off of targetOfferings) {
    const offId = off._id || off;
    let cm = await CourseMembership.findOne({ studentId, courseOfferingId: offId });
    if (!cm) {
      cm = await CourseMembership.create({
        studentEnrollmentId: enrollment._id,
        studentId,
        courseOfferingId: offId,
        teachingGroupId,
        practicalGroupId: practicalGroupId || null,
        status: 'Enrolled',
      });
    } else {
      cm.teachingGroupId = teachingGroupId;
      if (practicalGroupId) cm.practicalGroupId = practicalGroupId;
      await cm.save();
    }
    createdMemberships.push(cm);
  }

  await logAudit({
    actor: req.user,
    action: 'STUDENT_ENROLLED',
    entity: 'StudentEnrollment',
    entityId: enrollment._id,
    metadata: { studentId, academicSessionId, academicPeriodId, teachingGroupId }
  });

  res.status(201).json(successResponse({ enrollment, memberships: createdMemberships }, 'Student enrolled successfully'));
});

// ─── SESSION ROLLOVER & STUDENT PROMOTION (CRITICAL WORKFLOW) ───
const rolloverSession = asyncHandler(async (req, res, next) => {
  const { currentSessionId, newSessionName, newStartDate, newEndDate, promotions } = req.body;

  if (!currentSessionId || !newSessionName || !newStartDate || !newEndDate) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'currentSessionId, newSessionName, newStartDate, and newEndDate are required'));
  }

  const currentSession = await AcademicSession.findById(currentSessionId);
  if (!currentSession) return next(new ApiError(404, 'NOT_FOUND', 'Current session not found'));

  // 1. Mark current session as Completed
  currentSession.status = 'Completed';
  currentSession.isCurrent = false;
  await currentSession.save();

  // 2. Create and Activate new academic session
  const newSession = await AcademicSession.create({
    institutionId: currentSession.institutionId,
    name: newSessionName,
    startDate: new Date(newStartDate),
    endDate: new Date(newEndDate),
    status: 'Active',
    isCurrent: true,
  });

  // Ensure no other session is marked current
  await AcademicSession.updateMany({ _id: { $ne: newSession._id } }, { isCurrent: false });

  // 3. Process promotions (array of { studentId, programId, cohortId, newPeriodId, newTeachingGroupId, newPracticalGroupId, newCourseOfferingIds })
  const promotionResults = [];
  if (Array.isArray(promotions) && promotions.length > 0) {
    for (const promo of promotions) {
      const { studentId, programId, cohortId, newPeriodId, newTeachingGroupId, newPracticalGroupId, newCourseOfferingIds } = promo;

      // Mark the old enrollment as Promoted (NEVER modify its past course records or submissions!)
      await StudentEnrollment.updateMany(
        { studentId, academicSessionId: currentSession._id, status: 'Active' },
        { status: 'Promoted', promotedAt: new Date() }
      );

      // Create a BRAND NEW StudentEnrollment for the new session
      const newEnrollment = await StudentEnrollment.create({
        studentId,
        institutionId: currentSession.institutionId,
        programId,
        cohortId,
        academicSessionId: newSession._id,
        academicPeriodId: newPeriodId,
        teachingGroupId: newTeachingGroupId,
        status: 'Active',
      });

      // Enroll into new session course offerings
      if (Array.isArray(newCourseOfferingIds) && newCourseOfferingIds.length > 0) {
        for (const offId of newCourseOfferingIds) {
          await CourseMembership.create({
            studentEnrollmentId: newEnrollment._id,
            studentId,
            courseOfferingId: offId,
            teachingGroupId: newTeachingGroupId,
            practicalGroupId: newPracticalGroupId || null,
            status: 'Enrolled',
          });
        }
      }

      promotionResults.push({
        studentId,
        oldSession: currentSession.name,
        newSession: newSession.name,
        newEnrollmentId: newEnrollment._id,
      });
    }
  }

  await logAudit({
    actor: req.user,
    action: 'SESSION_ROLLOVER',
    entity: 'AcademicSession',
    entityId: newSession._id,
    metadata: {
      fromSession: currentSession.name,
      toSession: newSession.name,
      promotedCount: promotionResults.length,
    }
  });

  res.status(200).json(successResponse({
    completedSession: currentSession,
    newActiveSession: newSession,
    promotions: promotionResults,
  }, 'Session rollover and student promotions completed successfully'));
});

module.exports = {
  getInstitutions,
  createInstitution,
  getDepartments,
  createDepartment,
  getPrograms,
  createProgram,
  getAcademicSessions,
  createAcademicSession,
  updateAcademicSession,
  getAcademicPeriods,
  getAdmissionCohorts,
  createAdmissionCohort,
  getTeachingGroups,
  createTeachingGroup,
  createPracticalGroup,
  getCourseOfferings,
  createCourseOffering,
  enrollStudent,
  rolloverSession,
};
