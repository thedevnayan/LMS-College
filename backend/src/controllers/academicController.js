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
const Curriculum = require('../models/Curriculum');
const FacultyAllocation = require('../models/FacultyAllocation');
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

// ─── GET STUDENTS IN A TEACHING GROUP / BATCH ───
const getBatchStudents = asyncHandler(async (req, res, next) => {
  const { batchId } = req.params;
  const enrollments = await StudentEnrollment.find({
    teachingGroupId: batchId,
    status: 'Active',
  })
    .populate('studentId', 'name email avatarUrl educationGap admissionYear qualification')
    .populate('academicPeriodId', 'name periodNumber')
    .populate('programId', 'name code')
    .populate('cohortId', 'name')
    .populate('academicSessionId', 'name')
    .sort({ 'studentId.name': 1 });

  const students = enrollments.map(e => ({
    enrollmentId: e._id,
    student: e.studentId,
    status: e.status,
    period: e.academicPeriodId,
    program: e.programId,
    cohort: e.cohortId,
    session: e.academicSessionId,
  }));

  res.status(200).json(successResponse(students));
});

// ─── STANDALONE BATCH PROMOTION ───
const promoteBatch = asyncHandler(async (req, res, next) => {
  const {
    sourceBatchId,
    targetSessionId,
    targetProgramId,
    targetCohortId,
    targetPeriodId,
    targetBatchId,
    targetBatchName,
    selectedStudentIds,
    excludedStudentIds = [],
  } = req.body;

  if (!sourceBatchId || !targetSessionId || !targetPeriodId) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'sourceBatchId, targetSessionId, and targetPeriodId are required'));
  }

  const targetSession = await AcademicSession.findById(targetSessionId);
  if (!targetSession) return next(new ApiError(404, 'NOT_FOUND', 'Target session not found'));

  const sourceFilter = {
    teachingGroupId: sourceBatchId,
    status: 'Active',
  };

  if (Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
    sourceFilter.studentId = { $in: selectedStudentIds, $nin: excludedStudentIds };
  } else if (Array.isArray(excludedStudentIds) && excludedStudentIds.length > 0) {
    sourceFilter.studentId = { $nin: excludedStudentIds };
  }

  const sourceEnrollments = await StudentEnrollment.find(sourceFilter);
  if (sourceEnrollments.length === 0) {
    return res.status(200).json(successResponse([], 'No active students found in this batch to promote'));
  }

  const programToUse = targetProgramId || sourceEnrollments[0].programId;
  const cohortToUse = targetCohortId || sourceEnrollments[0].cohortId;

  let finalTargetBatchId = targetBatchId;
  if (!finalTargetBatchId || finalTargetBatchId === 'NEW') {
    const batchName = targetBatchName || 'Batch A';
    let targetGroup = await TeachingGroup.findOne({
      academicSessionId: targetSession._id,
      programId: programToUse,
      academicPeriodId: targetPeriodId,
      name: batchName,
    });
    if (!targetGroup) {
      targetGroup = await TeachingGroup.create({
        institutionId: targetSession.institutionId,
        programId: programToUse,
        cohortId: cohortToUse,
        academicSessionId: targetSession._id,
        academicPeriodId: targetPeriodId,
        name: batchName,
      });
    }
    finalTargetBatchId = targetGroup._id;
  }

  // Resolve target semester course offerings (from session offerings or auto-generated from curriculum)
  let targetOfferings = await CourseOffering.find({
    academicSessionId: targetSession._id,
    programId: programToUse,
    academicPeriodId: targetPeriodId,
  });

  if (targetOfferings.length === 0) {
    const currSubjects = await Curriculum.find({
      programId: programToUse,
      academicPeriodId: targetPeriodId,
    }).populate('courseId');

    if (currSubjects.length > 0) {
      const defaultProf = (await User.findOne({ role: 'professor' })) || req.user;
      for (const cs of currSubjects) {
        const off = await CourseOffering.create({
          courseId: cs.courseId?._id || cs.courseId,
          academicSessionId: targetSession._id,
          programId: programToUse,
          academicPeriodId: targetPeriodId,
          departmentId: cs.courseId?.departmentId || null,
          primaryTeacherId: cs.defaultTeacherId || cs.courseId?.professorId || defaultProf._id,
          status: 'Active',
        });
        targetOfferings.push(off);
      }
    }
  }

  const results = [];
  for (const oldEnr of sourceEnrollments) {
    oldEnr.status = 'Promoted';
    oldEnr.promotedAt = new Date();
    await oldEnr.save();

    const newEnr = await StudentEnrollment.create({
      studentId: oldEnr.studentId,
      institutionId: targetSession.institutionId,
      programId: programToUse,
      cohortId: cohortToUse,
      academicSessionId: targetSession._id,
      academicPeriodId: targetPeriodId,
      teachingGroupId: finalTargetBatchId,
      status: 'Active',
      educationGap: 'None (Continuous Enrollment)',
    });

    // Auto-enroll in target semester subjects
    for (const off of targetOfferings) {
      const cm = await CourseMembership.findOne({ studentId: oldEnr.studentId, courseOfferingId: off._id });
      if (!cm) {
        await CourseMembership.create({
          studentEnrollmentId: newEnr._id,
          studentId: oldEnr.studentId,
          courseOfferingId: off._id,
          teachingGroupId: finalTargetBatchId,
          status: 'Enrolled',
        });
      }
    }

    results.push({
      studentId: oldEnr.studentId,
      newEnrollmentId: newEnr._id,
    });
  }

  await logAudit({
    actor: req.user,
    action: 'BATCH_PROMOTED',
    entity: 'TeachingGroup',
    entityId: finalTargetBatchId,
    metadata: {
      sourceBatchId,
      promotedCount: results.length,
      targetSession: targetSession.name,
    }
  });

  res.status(200).json(successResponse(results, `Successfully promoted ${results.length} student(s) to the target batch`));
});

// ─── SESSION ROLLOVER & STUDENT PROMOTION (CRITICAL WORKFLOW) ───
const rolloverSession = asyncHandler(async (req, res, next) => {
  const {
    currentSessionId,
    newSessionName,
    newStartDate,
    newEndDate,
    promotions = [],
    batchPromotions = [],
  } = req.body;

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

  const promotionResults = [];

  // 3a. Process Batch-Level Promotions (all students in a batch)
  if (Array.isArray(batchPromotions) && batchPromotions.length > 0) {
    for (const bp of batchPromotions) {
      const {
        sourceBatchId,
        targetProgramId,
        targetCohortId,
        targetPeriodId,
        targetBatchId,
        targetBatchName,
        selectedStudentIds,
        excludedStudentIds = [],
      } = bp;

      if (!sourceBatchId || !targetPeriodId) continue;

      const sourceFilter = {
        teachingGroupId: sourceBatchId,
        academicSessionId: currentSession._id,
        status: 'Active',
      };

      if (Array.isArray(selectedStudentIds) && selectedStudentIds.length > 0) {
        sourceFilter.studentId = { $in: selectedStudentIds, $nin: excludedStudentIds };
      } else if (Array.isArray(excludedStudentIds) && excludedStudentIds.length > 0) {
        sourceFilter.studentId = { $nin: excludedStudentIds };
      }

      const sourceEnrollments = await StudentEnrollment.find(sourceFilter);
      if (sourceEnrollments.length === 0) continue;

      const programToUse = targetProgramId || sourceEnrollments[0].programId;
      const cohortToUse = targetCohortId || sourceEnrollments[0].cohortId;

      // Resolve or create target teaching group in the new session
      let finalTargetBatchId = targetBatchId;
      if (!finalTargetBatchId || finalTargetBatchId === 'NEW') {
        const batchName = targetBatchName || 'Batch A';
        let targetGroup = await TeachingGroup.findOne({
          academicSessionId: newSession._id,
          programId: programToUse,
          academicPeriodId: targetPeriodId,
          name: batchName,
        });
        if (!targetGroup) {
          targetGroup = await TeachingGroup.create({
            institutionId: currentSession.institutionId,
            programId: programToUse,
            cohortId: cohortToUse,
            academicSessionId: newSession._id,
            academicPeriodId: targetPeriodId,
            name: batchName,
          });
        }
        finalTargetBatchId = targetGroup._id;
      }

      for (const oldEnr of sourceEnrollments) {
        oldEnr.status = 'Promoted';
        oldEnr.promotedAt = new Date();
        await oldEnr.save();

        const newEnr = await StudentEnrollment.create({
          studentId: oldEnr.studentId,
          institutionId: currentSession.institutionId,
          programId: programToUse,
          cohortId: cohortToUse,
          academicSessionId: newSession._id,
          academicPeriodId: targetPeriodId,
          teachingGroupId: finalTargetBatchId,
          status: 'Active',
          educationGap: 'None (Continuous Enrollment)',
        });

        promotionResults.push({
          studentId: oldEnr.studentId,
          oldSession: currentSession.name,
          newSession: newSession.name,
          newEnrollmentId: newEnr._id,
          batchPromotion: true,
        });
      }
    }
  }

  // 3b. Process Individual Student Promotions (if any)
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
        educationGap: 'None (Continuous Enrollment)',
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

// ─── SEMESTER CURRICULUM MANAGEMENT ───
const getCurriculum = asyncHandler(async (req, res, next) => {
  const { programId, academicPeriodId } = req.query;
  if (!programId) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Program ID is required'));
  }

  const query = { programId };
  if (academicPeriodId) query.academicPeriodId = academicPeriodId;

  const curriculum = await Curriculum.find(query)
    .populate('courseId', 'title code credits classification thumbnail published')
    .populate('academicPeriodId', 'name periodNumber')
    .populate('programId', 'name code')
    .populate('defaultTeacherId', 'name email role')
    .sort({ order: 1, createdAt: 1 });

  res.status(200).json(successResponse(curriculum));
});

const addCurriculumSubject = asyncHandler(async (req, res, next) => {
  const {
    programId,
    academicPeriodId,
    courseId,
    newCourse, // Optional inline course creation: { title, code, credits, classification }
    defaultTeacherId,
    credits,
    classification,
    isElective,
    order,
  } = req.body;

  if (!programId || !academicPeriodId) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Program ID and Academic Period ID are required'));
  }

  let finalCourseId = courseId;

  // Inline course creation if newCourse is provided
  if (!finalCourseId && newCourse && newCourse.title) {
    const prog = await Program.findById(programId);
    const teacherId = defaultTeacherId || req.user._id;
    const createdCourse = await Course.create({
      title: newCourse.title.trim(),
      code: newCourse.code ? newCourse.code.trim().toUpperCase() : '',
      credits: newCourse.credits ? Number(newCourse.credits) : (credits ? Number(credits) : 4),
      classification: newCourse.classification || classification || 'both',
      departmentId: prog?.departmentId || null,
      professorId: teacherId,
      published: true,
    });
    finalCourseId = createdCourse._id;
  }

  if (!finalCourseId) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Course ID or new course details are required'));
  }

  // Check for duplicate in this semester
  const existing = await Curriculum.findOne({
    programId,
    academicPeriodId,
    courseId: finalCourseId,
  });

  if (existing) {
    return next(new ApiError(409, 'CONFLICT', 'This subject is already in this semester curriculum'));
  }

  const courseDoc = await Course.findById(finalCourseId);
  const finalCredits = credits !== undefined ? Number(credits) : (courseDoc?.credits || 4);
  const finalClassification = classification || courseDoc?.classification || 'both';

  const item = await Curriculum.create({
    programId,
    academicPeriodId,
    courseId: finalCourseId,
    defaultTeacherId: defaultTeacherId || courseDoc?.professorId || null,
    credits: finalCredits,
    classification: finalClassification,
    isElective: Boolean(isElective),
    order: order !== undefined ? Number(order) : 0,
  });

  const populatedItem = await Curriculum.findById(item._id)
    .populate('courseId', 'title code credits classification thumbnail published')
    .populate('academicPeriodId', 'name periodNumber')
    .populate('programId', 'name code')
    .populate('defaultTeacherId', 'name email role');

  await logAudit({
    actor: req.user,
    action: 'CURRICULUM_SUBJECT_ADDED',
    entity: 'Curriculum',
    entityId: item._id,
    metadata: { programId, academicPeriodId, courseId: finalCourseId },
  });

  res.status(201).json(successResponse(populatedItem, 'Subject added to semester curriculum successfully'));
});

const updateCurriculumSubject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { defaultTeacherId, credits, classification, isElective, order } = req.body;

  const item = await Curriculum.findById(id);
  if (!item) {
    return next(new ApiError(404, 'NOT_FOUND', 'Curriculum subject not found'));
  }

  if (defaultTeacherId !== undefined) item.defaultTeacherId = defaultTeacherId || null;
  if (credits !== undefined) item.credits = Number(credits);
  if (classification !== undefined) item.classification = classification;
  if (isElective !== undefined) item.isElective = Boolean(isElective);
  if (order !== undefined) item.order = Number(order);

  await item.save();

  const updated = await Curriculum.findById(item._id)
    .populate('courseId', 'title code credits classification thumbnail published')
    .populate('academicPeriodId', 'name periodNumber')
    .populate('programId', 'name code')
    .populate('defaultTeacherId', 'name email role');

  await logAudit({
    actor: req.user,
    action: 'CURRICULUM_SUBJECT_UPDATED',
    entity: 'Curriculum',
    entityId: item._id,
    metadata: { updates: req.body },
  });

  res.status(200).json(successResponse(updated, 'Curriculum subject updated successfully'));
});

const deleteCurriculumSubject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const item = await Curriculum.findById(id);
  if (!item) {
    return next(new ApiError(404, 'NOT_FOUND', 'Curriculum subject not found'));
  }

  item.deletedAt = new Date();
  await item.save();

  await logAudit({
    actor: req.user,
    action: 'CURRICULUM_SUBJECT_REMOVED',
    entity: 'Curriculum',
    entityId: item._id,
    metadata: { courseId: item.courseId, programId: item.programId, academicPeriodId: item.academicPeriodId },
  });

  res.status(200).json(successResponse({ id }, 'Subject removed from curriculum successfully'));
});

const syncCurriculumToOfferings = asyncHandler(async (req, res, next) => {
  const { programId, academicSessionId, academicPeriodId } = req.body;
  if (!programId || !academicSessionId) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Program ID and Academic Session ID are required'));
  }

  const session = await AcademicSession.findById(academicSessionId);
  if (!session) {
    return next(new ApiError(404, 'NOT_FOUND', 'Academic session not found'));
  }

  const query = { programId };
  if (academicPeriodId) query.academicPeriodId = academicPeriodId;

  const curriculumItems = await Curriculum.find(query).populate('courseId');
  if (curriculumItems.length === 0) {
    return res.status(200).json(successResponse([], 'No curriculum subjects found to sync'));
  }

  const defaultFaculty = (await User.findOne({ role: 'professor' })) || req.user;
  const syncedOfferings = [];

  for (const item of curriculumItems) {
    const courseId = item.courseId?._id || item.courseId;
    const periodId = item.academicPeriodId;
    const teacherId = item.defaultTeacherId || item.courseId?.professorId || defaultFaculty._id;

    let offering = await CourseOffering.findOne({
      courseId,
      academicSessionId,
      programId,
      academicPeriodId: periodId,
    });

    if (!offering) {
      offering = await CourseOffering.create({
        courseId,
        academicSessionId,
        programId,
        academicPeriodId: periodId,
        departmentId: item.courseId?.departmentId || null,
        primaryTeacherId: teacherId,
        status: 'Active',
      });
      syncedOfferings.push({ offering, action: 'created' });
    } else {
      if (item.defaultTeacherId && offering.primaryTeacherId?.toString() !== item.defaultTeacherId.toString()) {
        offering.primaryTeacherId = item.defaultTeacherId;
        await offering.save();
      }
      syncedOfferings.push({ offering, action: 'existing' });
    }
  }

  await logAudit({
    actor: req.user,
    action: 'CURRICULUM_SYNCED_TO_OFFERINGS',
    entity: 'CourseOffering',
    entityId: session._id,
    metadata: { programId, academicSessionId, count: syncedOfferings.length },
  });

  res.status(200).json(successResponse(syncedOfferings, `Synced ${syncedOfferings.length} subjects to academic session`));
});

// ─── FACULTY & INSTRUCTORS ───
const getFaculty = asyncHandler(async (req, res) => {
  const faculty = await User.find({
    role: { $in: ['professor', 'admin'] },
  }).select('_id name email role avatarUrl').sort({ name: 1 });

  res.status(200).json(successResponse(faculty));
});

// ─── BATCH & LAB FACULTY ALLOCATION ───
const getFacultyAllocations = asyncHandler(async (req, res, next) => {
  const { programId, academicPeriodId, academicSessionId } = req.query;
  if (!programId || !academicPeriodId || !academicSessionId) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'programId, academicPeriodId, and academicSessionId are required'));
  }

  const allocations = await FacultyAllocation.find({
    programId,
    academicPeriodId,
    academicSessionId,
  })
    .populate('courseId', 'title code credits classification')
    .populate('teachingGroupId', 'name')
    .populate('practicalGroupId', 'name')
    .populate('facultyId', 'name email role avatarUrl')
    .populate('classroomId', 'joinCode session classBatch type labBatch');

  res.status(200).json(successResponse(allocations));
});

const saveFacultyAllocations = asyncHandler(async (req, res, next) => {
  const {
    academicSessionId,
    programId,
    academicPeriodId,
    allocations, // Array of { courseId, teachingGroupId, type ('theory'|'lab'), practicalGroupId (optional), facultyId }
  } = req.body;

  if (!academicSessionId || !programId || !academicPeriodId || !Array.isArray(allocations)) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'academicSessionId, programId, academicPeriodId, and allocations array are required'));
  }

  const session = await AcademicSession.findById(academicSessionId);
  if (!session) {
    return next(new ApiError(404, 'NOT_FOUND', 'Academic session not found'));
  }

  const savedResults = [];

  for (const alloc of allocations) {
    const { courseId, teachingGroupId, type, practicalGroupId, facultyId } = alloc;
    if (!courseId || !teachingGroupId || !type || !facultyId) continue;

    const teachingGroup = await TeachingGroup.findById(teachingGroupId);
    if (!teachingGroup) continue;

    let practicalGroup = null;
    if (practicalGroupId) {
      practicalGroup = await PracticalGroup.findById(practicalGroupId);
    }

    // Determine batch name for Classroom (e.g. "Batch B" -> "B", or "B" -> "B")
    let classBatch = teachingGroup.name.replace(/^batch\s*/i, '').trim() || teachingGroup.name.trim();
    if (!classBatch) classBatch = 'A';

    let labBatch = null;
    if (type === 'lab') {
      labBatch = practicalGroup ? practicalGroup.name.trim() : (alloc.labBatchName || '1');
    }

    // 1. Ensure or update Classroom
    let classroom = await Classroom.findOne({
      courseId,
      session: session.name,
      classBatch: classBatch.toUpperCase(),
      type,
      labBatch: type === 'lab' ? labBatch : null,
    });

    if (!classroom) {
      classroom = await Classroom.create({
        courseId,
        professorId: facultyId,
        session: session.name,
        classBatch: classBatch.toUpperCase(),
        type,
        labBatch: type === 'lab' ? labBatch : null,
      });
    } else {
      if (classroom.professorId.toString() !== facultyId.toString()) {
        classroom.professorId = facultyId;
        await classroom.save();
      }
    }

    // 2. Upsert FacultyAllocation record
    const filter = {
      academicSessionId,
      programId,
      academicPeriodId,
      courseId,
      teachingGroupId,
      type,
      practicalGroupId: practicalGroupId || null,
    };

    let allocationDoc = await FacultyAllocation.findOne(filter);
    if (!allocationDoc) {
      allocationDoc = await FacultyAllocation.create({
        ...filter,
        facultyId,
        classroomId: classroom._id,
      });
    } else {
      allocationDoc.facultyId = facultyId;
      allocationDoc.classroomId = classroom._id;
      await allocationDoc.save();
    }

    savedResults.push(allocationDoc);
  }

  await logAudit({
    actor: req.user,
    action: 'FACULTY_ALLOCATED_TO_BATCHES',
    entity: 'FacultyAllocation',
    entityId: session._id,
    metadata: { programId, academicPeriodId, count: savedResults.length }
  });

  res.status(200).json(successResponse(savedResults, `Successfully allocated faculty to ${savedResults.length} batch/lab group(s)`));
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
  getBatchStudents,
  promoteBatch,
  rolloverSession,
  getCurriculum,
  addCurriculumSubject,
  updateCurriculumSubject,
  deleteCurriculumSubject,
  syncCurriculumToOfferings,
  getFaculty,
  getFacultyAllocations,
  saveFacultyAllocations,
};
