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
const User = require('../models/User');
const Course = require('../models/Course');
const Classroom = require('../models/Classroom');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const Material = require('../models/Material');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Resolve the active or requested academic session
 */
const resolveSession = async (sessionId) => {
  if (sessionId && mongoose.isValidObjectId(sessionId)) {
    const s = await AcademicSession.findById(sessionId);
    if (s) return s;
  }
  let current = await AcademicSession.findOne({ isCurrent: true });
  if (!current) {
    current = await AcademicSession.findOne({ status: 'Active' });
  }
  if (!current) {
    current = await AcademicSession.findOne().sort({ startDate: -1 });
  }
  return current;
};

// ─── 1. INSTITUTION & SESSION OVERVIEW ───
const getOverview = asyncHandler(async (req, res) => {
  const session = await resolveSession(req.query.sessionId);
  if (!session) {
    return res.status(200).json(successResponse({ message: 'No academic sessions configured' }));
  }

  // Aggregate counts in this session
  const enrollments = await StudentEnrollment.find({ academicSessionId: session._id });
  const uniqueStudentIds = [...new Set(enrollments.map(e => e.studentId.toString()))];
  const activeStudentsCount = enrollments.filter(e => e.status === 'Active').length;

  const totalTeachers = await User.countDocuments({ role: { $in: ['professor', 'teacher'] }, isActive: true });
  const programsCount = await Program.countDocuments({ isActive: true });
  const departmentsCount = await Department.countDocuments({ isActive: true });

  const courseOfferings = await CourseOffering.find({ academicSessionId: session._id });
  const activeBatchesCount = await TeachingGroup.countDocuments({ academicSessionId: session._id });

  // Assignments & Submissions in this session
  const offeringIds = courseOfferings.map(co => co._id);
  const classrooms = await Classroom.find({ session: { $regex: session.name, $options: 'i' } });
  const classroomIds = classrooms.map(c => c._id);

  const assignments = await Assignment.find({
    $or: [
      { academicSessionId: session._id },
      { courseOfferingId: { $in: offeringIds } },
      { classroomId: { $in: classroomIds } },
    ],
  });
  const assignmentIds = assignments.map(a => a._id);

  const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } });
  const gradedSubmissions = submissions.filter(s => s.status === 'graded');

  // Tests & Attempts in this session
  const tests = await Test.find({
    $or: [
      { academicSessionId: session._id },
      { courseOfferingId: { $in: offeringIds } },
      { classroomId: { $in: classroomIds } },
    ],
  });
  const testIds = tests.map(t => t._id);

  const testAttempts = await TestAttempt.find({ testId: { $in: testIds }, status: 'completed' });

  // Compute metrics
  const totalSubmissionsExpected = assignments.length * uniqueStudentIds.length;
  const assignmentCompletionRate = totalSubmissionsExpected > 0
    ? Math.round((submissions.length / totalSubmissionsExpected) * 100)
    : (submissions.length > 0 ? 100 : 0);

  const totalAttemptsExpected = tests.length * uniqueStudentIds.length;
  const testParticipationRate = totalAttemptsExpected > 0
    ? Math.round((testAttempts.length / totalAttemptsExpected) * 100)
    : (testAttempts.length > 0 ? 100 : 0);

  // Score distribution & overall average
  let totalScorePct = 0;
  let scoreCount = 0;
  const gradeBuckets = { A: 0, B: 0, C: 0, D: 0, F: 0 };

  gradedSubmissions.forEach(sub => {
    const a = assignments.find(x => x._id.toString() === sub.assignmentId.toString());
    const max = (a && a.maxMarks) ? a.maxMarks : 100;
    const pct = Math.min(100, Math.round(((sub.marks || 0) / max) * 100));
    totalScorePct += pct;
    scoreCount++;
    if (pct >= 80) gradeBuckets.A++;
    else if (pct >= 65) gradeBuckets.B++;
    else if (pct >= 50) gradeBuckets.C++;
    else if (pct >= 40) gradeBuckets.D++;
    else gradeBuckets.F++;
  });

  testAttempts.forEach(ta => {
    const t = tests.find(x => x._id.toString() === ta.testId.toString());
    let max = 0;
    if (t && t.questions && t.questions.length > 0) {
      max = t.questions.reduce((acc, q) => acc + (q.points || 1), 0);
    }
    if (max <= 0) max = 100;
    const pct = Math.min(100, Math.round(((ta.score || 0) / max) * 100));
    totalScorePct += pct;
    scoreCount++;
    if (pct >= 80) gradeBuckets.A++;
    else if (pct >= 65) gradeBuckets.B++;
    else if (pct >= 50) gradeBuckets.C++;
    else if (pct >= 40) gradeBuckets.D++;
    else gradeBuckets.F++;
  });

  const averageScore = scoreCount > 0 ? Math.round(totalScorePct / scoreCount) : 0;

  res.status(200).json(successResponse({
    session: {
      _id: session._id,
      name: session.name,
      status: session.status,
      isCurrent: session.isCurrent,
      startDate: session.startDate,
      endDate: session.endDate,
    },
    metrics: {
      totalStudents: uniqueStudentIds.length,
      activeStudents: activeStudentsCount,
      totalTeachers,
      programsCount,
      departmentsCount,
      activeCourses: courseOfferings.length,
      activeBatches: activeBatchesCount,
      assignmentsCount: assignments.length,
      submissionsCount: submissions.length,
      testsCount: tests.length,
      testAttemptsCount: testAttempts.length,
      assignmentCompletionRate,
      testParticipationRate,
      averageScore,
    },
    gradeDistribution: gradeBuckets,
  }));
});

// ─── 2. PROGRAM-LEVEL MIS ───
const getProgramAnalytics = asyncHandler(async (req, res, next) => {
  const { programId } = req.params;
  const session = await resolveSession(req.query.sessionId);

  const program = await Program.findById(programId).populate('departmentId', 'name code');
  if (!program) return next(new ApiError(404, 'NOT_FOUND', 'Program not found'));

  const cohorts = await AdmissionCohort.find({ programId: program._id });
  const periods = await AcademicPeriod.find({ programId: program._id }).sort({ periodNumber: 1 });
  const batches = await TeachingGroup.find({ programId: program._id, academicSessionId: session._id });

  const enrollments = await StudentEnrollment.find({ programId: program._id, academicSessionId: session._id })
    .populate('studentId', 'name email avatarUrl')
    .populate('teachingGroupId', 'name')
    .populate('academicPeriodId', 'name periodNumber');

  const courseOfferings = await CourseOffering.find({ programId: program._id, academicSessionId: session._id })
    .populate('courseId', 'title code credits')
    .populate('primaryTeacherId', 'name email');

  // Gather program performance
  const offeringIds = courseOfferings.map(o => o._id);
  const assignments = await Assignment.find({ courseOfferingId: { $in: offeringIds } });
  const tests = await Test.find({ courseOfferingId: { $in: offeringIds } });

  const submissions = await Submission.find({ assignmentId: { $in: assignments.map(a => a._id) }, status: 'graded' });
  const attempts = await TestAttempt.find({ testId: { $in: tests.map(t => t._id) }, status: 'completed' });

  let totalScore = 0;
  let count = 0;
  submissions.forEach(s => { totalScore += (s.marks || 0); count++; });
  attempts.forEach(a => { totalScore += (a.score || 0); count++; });

  const avgPerformance = count > 0 ? (totalScore / count).toFixed(1) : 0;

  res.status(200).json(successResponse({
    program,
    sessionName: session.name,
    totalStudents: enrollments.length,
    cohorts,
    periods,
    batchesCount: batches.length,
    coursesCount: courseOfferings.length,
    avgPerformance,
    courseOfferings,
    enrollments,
  }));
});

// ─── 3. COURSE-LEVEL MIS ───
const getCourseAnalytics = asyncHandler(async (req, res, next) => {
  const { offeringId } = req.params;

  const offering = await CourseOffering.findById(offeringId)
    .populate('courseId', 'title code credits classification')
    .populate('programId', 'name code')
    .populate('academicPeriodId', 'name periodNumber')
    .populate('academicSessionId', 'name status')
    .populate('primaryTeacherId', 'name email');

  if (!offering) return next(new ApiError(404, 'NOT_FOUND', 'Course offering not found'));

  const memberships = await CourseMembership.find({ courseOfferingId: offering._id })
    .populate('studentId', 'name email')
    .populate('teachingGroupId', 'name')
    .populate('practicalGroupId', 'name');

  // Find assignments & tests for this offering or bridged classroom
  const query = {
    $or: [{ courseOfferingId: offering._id }],
  };
  if (offering.classroomId) {
    query.$or.push({ classroomId: offering.classroomId });
  }

  const assignments = await Assignment.find(query);
  const tests = await Test.find(query);

  const assignmentIds = assignments.map(a => a._id);
  const testIds = tests.map(t => t._id);

  const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } });
  const attempts = await TestAttempt.find({ testId: { $in: testIds }, status: 'completed' });

  // Marks metrics
  let highestScore = 0;
  let lowestScore = Infinity;
  let totalScore = 0;
  let gradedCount = 0;

  submissions.forEach(s => {
    if (s.status === 'graded') {
      const marks = s.marks || 0;
      if (marks > highestScore) highestScore = marks;
      if (marks < lowestScore) lowestScore = marks;
      totalScore += marks;
      gradedCount++;
    }
  });

  attempts.forEach(ta => {
    const sc = ta.score || 0;
    if (sc > highestScore) highestScore = sc;
    if (sc < lowestScore) lowestScore = sc;
    totalScore += sc;
    gradedCount++;
  });

  if (lowestScore === Infinity) lowestScore = 0;
  const avgScore = gradedCount > 0 ? (totalScore / gradedCount).toFixed(1) : 0;

  res.status(200).json(successResponse({
    offering,
    enrolledStudentsCount: memberships.length,
    memberships,
    assignmentsCount: assignments.length,
    submissionsCount: submissions.length,
    testsCount: tests.length,
    testAttemptsCount: attempts.length,
    submissionRate: assignments.length > 0 && memberships.length > 0
      ? Math.round((submissions.length / (assignments.length * memberships.length)) * 100)
      : 0,
    highestScore,
    lowestScore,
    avgScore,
    assignments,
    tests,
  }));
});

// ─── 4. BATCH-LEVEL MIS ───
const getBatchAnalytics = asyncHandler(async (req, res, next) => {
  const { batchId } = req.params;

  const batch = await TeachingGroup.findById(batchId)
    .populate('programId', 'name code')
    .populate('academicPeriodId', 'name periodNumber')
    .populate('academicSessionId', 'name status');

  if (!batch) return next(new ApiError(404, 'NOT_FOUND', 'Batch not found'));

  const practicalGroups = await PracticalGroup.find({ teachingGroupId: batch._id });
  const enrollments = await StudentEnrollment.find({ teachingGroupId: batch._id, status: 'Active' })
    .populate('studentId', 'name email avatarUrl');

  const studentIds = enrollments.map(e => e.studentId._id);

  // Assignments & tests for this batch
  const assignments = await Assignment.find({ teachingGroupId: batch._id });
  const tests = await Test.find({ teachingGroupId: batch._id });

  const assignmentIds = assignments.map(a => a._id);
  const testIds = tests.map(t => t._id);

  const submissions = await Submission.find({ studentId: { $in: studentIds }, assignmentId: { $in: assignmentIds } });
  const attempts = await TestAttempt.find({ studentId: { $in: studentIds }, testId: { $in: testIds }, status: 'completed' });

  // Calculate per-student performance in batch
  const studentStats = enrollments.map(enr => {
    const sId = enr.studentId._id.toString();
    const mySubs = submissions.filter(s => s.studentId.toString() === sId);
    const myAttempts = attempts.filter(a => a.studentId.toString() === sId);

    let myTotalScore = 0;
    let myTotalPossible = 0;

    mySubs.forEach(s => {
      const a = assignments.find(x => x._id.toString() === s.assignmentId.toString());
      const max = a?.maxMarks || 100;
      myTotalScore += (s.marks || 0);
      myTotalPossible += max;
    });

    myAttempts.forEach(ta => {
      myTotalScore += (ta.score || 0);
      myTotalPossible += 100;
    });

    const completionRate = (assignments.length + tests.length) > 0
      ? Math.round(((mySubs.length + myAttempts.length) / (assignments.length + tests.length)) * 100)
      : 100;

    const avgPct = myTotalPossible > 0 ? Math.round((myTotalScore / myTotalPossible) * 100) : 0;

    return {
      student: enr.studentId,
      completionRate,
      averagePercentage: avgPct,
      submissionsCount: mySubs.length,
      attemptsCount: myAttempts.length,
    };
  });

  // Sort top performers and students needing attention
  const topPerformers = [...studentStats].sort((a, b) => b.averagePercentage - a.averagePercentage).slice(0, 5);
  const needsAttention = studentStats.filter(s => s.completionRate < 60 || s.averagePercentage < 45);

  res.status(200).json(successResponse({
    batch,
    practicalGroups,
    totalStudents: enrollments.length,
    assignmentsCount: assignments.length,
    testsCount: tests.length,
    topPerformers,
    needsAttention,
    studentStats,
  }));
});

// ─── 5. FULL STUDENT ACADEMIC PROFILE, HISTORY & TIMELINE ───
const getStudentHistoryAndTimeline = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;

  // Authorization check: Student can only view self; Prof/Admin can view any student
  if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
    return next(new ApiError(403, 'FORBIDDEN', 'You cannot view other students academic history'));
  }

  const student = await User.findById(studentId).select('name email avatarUrl');
  if (!student) return next(new ApiError(404, 'NOT_FOUND', 'Student not found'));

  // Fetch ALL historical enrollments across all academic sessions
  const enrollments = await StudentEnrollment.find({ studentId: student._id })
    .populate('academicSessionId', 'name status startDate endDate isCurrent')
    .populate('programId', 'name code degreeType')
    .populate('cohortId', 'name startYear endYear')
    .populate('academicPeriodId', 'name periodNumber')
    .populate('teachingGroupId', 'name')
    .sort({ 'academicSessionId.startDate': -1 });

  // Current enrollment (Active in current session)
  const currentEnrollment = enrollments.find(e => e.status === 'Active') || enrollments[0];

  // For each historical enrollment, fetch courses, assignments, submissions, tests, scores
  const historicalSessions = await Promise.all(
    enrollments.map(async (enr) => {
      const sessionId = enr.academicSessionId?._id;
      if (!sessionId) return null;

      // Find course memberships for this enrollment
      const memberships = await CourseMembership.find({ studentEnrollmentId: enr._id })
        .populate({
          path: 'courseOfferingId',
          populate: [
            { path: 'courseId', select: 'title code credits classification' },
            { path: 'primaryTeacherId', select: 'name email' }
          ]
        })
        .populate('practicalGroupId', 'name');

      const offeringIds = memberships.map(m => m.courseOfferingId?._id).filter(Boolean);

      // Fetch assignments in this academic context
      const assignments = await Assignment.find({
        $or: [
          { courseOfferingId: { $in: offeringIds } },
          { academicSessionId: sessionId, academicPeriodId: enr.academicPeriodId?._id },
        ]
      });
      const assignmentIds = assignments.map(a => a._id);

      const submissions = await Submission.find({
        studentId: student._id,
        assignmentId: { $in: assignmentIds }
      }).populate('assignmentId', 'title maxMarks dueDate');

      // Fetch tests in this academic context
      const tests = await Test.find({
        $or: [
          { courseOfferingId: { $in: offeringIds } },
          { academicSessionId: sessionId, academicPeriodId: enr.academicPeriodId?._id },
        ]
      });
      const testIds = tests.map(t => t._id);

      const attempts = await TestAttempt.find({
        studentId: student._id,
        testId: { $in: testIds }
      }).populate('testId', 'title testType');

      // Calculate session performance
      let scoreObtained = 0;
      let maxMarks = 0;

      submissions.forEach(s => {
        if (s.status === 'graded') {
          scoreObtained += (s.marks || 0);
          maxMarks += (s.assignmentId?.maxMarks || 100);
        }
      });

      attempts.forEach(ta => {
        if (ta.status === 'completed') {
          scoreObtained += (ta.score || 0);
          maxMarks += 100;
        }
      });

      const averageScore = maxMarks > 0 ? Math.round((scoreObtained / maxMarks) * 100) : 0;

      return {
        session: enr.academicSessionId,
        program: enr.programId,
        cohort: enr.cohortId,
        period: enr.academicPeriodId,
        batch: enr.teachingGroupId,
        status: enr.status,
        enrolledAt: enr.enrolledAt,
        promotedAt: enr.promotedAt,
        courses: memberships,
        assignmentsCount: assignments.length,
        submissions,
        testsCount: tests.length,
        testAttempts: attempts,
        averageScore,
      };
    })
  );

  const cleanHistory = historicalSessions.filter(Boolean);

  // ─── GENERATE REAL DYNAMIC ACTIVITY TIMELINE ───
  const timelineEvents = [];

  for (const h of cleanHistory) {
    // 1. Enrollment Event
    timelineEvents.push({
      type: 'ENROLLMENT',
      title: `Joined ${h.program?.name || 'Program'} ${h.period?.name || ''}`,
      subtitle: `${h.session?.name} • ${h.batch?.name || ''}`,
      timestamp: h.enrolledAt,
      sessionName: h.session?.name,
      badge: 'Enrollment',
    });

    // 2. Submission Events
    h.submissions.forEach(sub => {
      timelineEvents.push({
        type: 'SUBMISSION',
        title: `Submitted: ${sub.assignmentId?.title || 'Assignment'}`,
        subtitle: `Score: ${sub.marks !== null ? `${sub.marks}/${sub.assignmentId?.maxMarks || 100}` : 'Pending grading'}`,
        timestamp: sub.submittedAt || sub.createdAt,
        sessionName: h.session?.name,
        badge: 'Assignment',
      });
    });

    // 3. Test Attempt Events
    h.testAttempts.forEach(ta => {
      timelineEvents.push({
        type: 'TEST_ATTEMPT',
        title: `Attempted: ${ta.testId?.title || 'Test'}`,
        subtitle: `Score: ${ta.score || 0} pts • Status: ${ta.status}`,
        timestamp: ta.completedAt || ta.startedAt || ta.createdAt,
        sessionName: h.session?.name,
        badge: 'Test',
      });
    });
  }

  // Sort timeline newest first
  timelineEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Determine Factual Performance Indicators
  const indicators = [];
  if (cleanHistory.length >= 2) {
    const latestScore = cleanHistory[0].averageScore;
    const prevScore = cleanHistory[1].averageScore;
    if (latestScore > prevScore + 10) indicators.push({ type: 'IMPROVEMENT', text: `Scores improved by ${latestScore - prevScore}% since last session` });
    else if (latestScore < prevScore - 10) indicators.push({ type: 'DECLINE', text: `Scores declined by ${prevScore - latestScore}% since last session` });
  }
  if (cleanHistory[0] && cleanHistory[0].averageScore >= 85) {
    indicators.push({ type: 'TOP_PERFORMER', text: 'Consistently high academic performance' });
  }

  res.status(200).json(successResponse({
    student,
    current: currentEnrollment,
    history: cleanHistory,
    timeline: timelineEvents,
    indicators,
  }));
});

// ─── 6. MULTI-SESSION COMPARISON ───
const compareSessions = asyncHandler(async (req, res) => {
  const sessions = await AcademicSession.find().sort({ startDate: 1 });

  const comparativeData = await Promise.all(
    sessions.map(async (sess) => {
      const enrollments = await StudentEnrollment.find({ academicSessionId: sess._id });
      const studentCount = enrollments.length;

      const offerings = await CourseOffering.find({ academicSessionId: sess._id });
      const offeringIds = offerings.map(o => o._id);

      const assignments = await Assignment.find({
        $or: [{ academicSessionId: sess._id }, { courseOfferingId: { $in: offeringIds } }]
      });
      const submissions = await Submission.find({ assignmentId: { $in: assignments.map(a => a._id) }, status: 'graded' });

      const tests = await Test.find({
        $or: [{ academicSessionId: sess._id }, { courseOfferingId: { $in: offeringIds } }]
      });
      const attempts = await TestAttempt.find({ testId: { $in: tests.map(t => t._id) }, status: 'completed' });

      let totalScore = 0;
      let count = 0;
      let passedCount = 0;

      submissions.forEach(s => {
        const max = 100;
        const pct = ((s.marks || 0) / max) * 100;
        totalScore += pct;
        if (pct >= 40) passedCount++;
        count++;
      });

      attempts.forEach(ta => {
        const pct = ta.score || 0;
        totalScore += pct;
        if (pct >= 40) passedCount++;
        count++;
      });

      const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
      const passPercentage = count > 0 ? Math.round((passedCount / count) * 100) : 0;

      return {
        sessionId: sess._id,
        sessionName: sess.name,
        status: sess.status,
        studentCount,
        courseCount: offerings.length,
        averageScore: avgScore,
        passPercentage,
        assignmentsCount: assignments.length,
        submissionsCount: submissions.length,
        testsCount: tests.length,
        attemptsCount: attempts.length,
      };
    })
  );

  res.status(200).json(successResponse(comparativeData));
});

// ─── 7. GLOBAL ACADEMIC SEARCH ───
const globalAcademicSearch = asyncHandler(async (req, res) => {
  const query = req.query.query ? req.query.query.trim() : '';
  if (!query) {
    return res.status(200).json(successResponse({ students: [], courses: [], batches: [] }));
  }

  const regex = new RegExp(query, 'i');

  // Search Students
  const students = await User.find({
    role: 'student',
    $or: [{ name: regex }, { email: regex }],
  }).select('name email avatarUrl').limit(10);

  // Search Courses
  const courses = await Course.find({
    $or: [{ title: regex }, { code: regex }],
  }).select('title code credits').limit(10);

  // Search Batches
  const batches = await TeachingGroup.find({
    name: regex,
  }).populate('programId', 'name code').populate('academicSessionId', 'name').limit(10);

  res.status(200).json(successResponse({
    students,
    courses,
    batches,
  }));
});

// ─── 8. REPORTS CSV EXPORT ───
const exportReport = asyncHandler(async (req, res, next) => {
  const { type = 'students', sessionId } = req.query;
  const session = await resolveSession(sessionId);

  let csvRows = [];

  if (type === 'students') {
    const enrollments = await StudentEnrollment.find({ academicSessionId: session._id })
      .populate('studentId', 'name email')
      .populate('programId', 'name code')
      .populate('academicPeriodId', 'name')
      .populate('teachingGroupId', 'name');

    csvRows.push(['Student Name', 'Email', 'Session', 'Program', 'Period', 'Batch', 'Status']);
    enrollments.forEach(e => {
      csvRows.push([
        e.studentId?.name || '',
        e.studentId?.email || '',
        session.name,
        e.programId?.name || '',
        e.academicPeriodId?.name || '',
        e.teachingGroupId?.name || '',
        e.status,
      ]);
    });
  } else if (type === 'courses') {
    const offerings = await CourseOffering.find({ academicSessionId: session._id })
      .populate('courseId', 'title code credits')
      .populate('programId', 'name code')
      .populate('academicPeriodId', 'name')
      .populate('primaryTeacherId', 'name email');

    csvRows.push(['Course Title', 'Course Code', 'Credits', 'Session', 'Program', 'Period', 'Faculty']);
    offerings.forEach(o => {
      csvRows.push([
        o.courseId?.title || '',
        o.courseId?.code || '',
        o.courseId?.credits || '',
        session.name,
        o.programId?.name || '',
        o.academicPeriodId?.name || '',
        o.primaryTeacherId?.name || '',
      ]);
    });
  }

  const csvContent = csvRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${session.name}.csv"`);
  res.status(200).send(csvContent);
});

module.exports = {
  getOverview,
  getProgramAnalytics,
  getCourseAnalytics,
  getBatchAnalytics,
  getStudentHistoryAndTimeline,
  compareSessions,
  globalAcademicSearch,
  exportReport,
};
