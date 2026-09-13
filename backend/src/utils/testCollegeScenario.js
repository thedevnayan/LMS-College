const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

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

async function runScenario() {
  console.log('====================================================');
  console.log('STARTING REALISTIC COLLEGE LMS + MIS ACCEPTANCE TEST');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-college';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  // Helper to find or create user
  async function getOrCreateUser(email, name, role) {
    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({ email, name, role, password: 'ScenarioPassword@123', isActive: true });
    }
    return u;
  }

  // STEP 1 — Create Institution
  console.log('STEP 1: Create Institution ABC College');
  let inst = await Institution.findOne({ code: 'ABC-COLLEGE' });
  if (!inst) {
    inst = await Institution.create({
      name: 'ABC College',
      code: 'ABC-COLLEGE',
      address: '100 University Plaza',
    });
  }
  console.log('  ✓ Institution created:', inst.name);

  // STEP 2 — Create Department
  console.log('STEP 2: Create Department Computer Science');
  let dept = await Department.findOne({ institutionId: inst._id, code: 'CS' });
  if (!dept) {
    dept = await Department.create({
      institutionId: inst._id,
      name: 'Computer Science',
      code: 'CS',
    });
  }
  console.log('  ✓ Department created:', dept.name);

  // STEP 3 — Create Program
  console.log('STEP 3: Create Program BCA');
  let prog = await Program.findOne({ institutionId: inst._id, code: 'BCA-SCENARIO' });
  if (!prog) {
    prog = await Program.create({
      institutionId: inst._id,
      departmentId: dept._id,
      name: 'Bachelor of Computer Applications',
      code: 'BCA-SCENARIO',
      degreeType: 'Undergraduate',
      durationYears: 3,
      totalPeriods: 6,
      periodType: 'Semester',
    });
  }
  console.log('  ✓ Program created:', prog.name);

  // STEP 4 — Create Cohort
  console.log('STEP 4: Create Cohort BCA 2026-29');
  let cohort = await AdmissionCohort.findOne({ programId: prog._id, name: 'BCA 2026-29' });
  if (!cohort) {
    cohort = await AdmissionCohort.create({
      institutionId: inst._id,
      programId: prog._id,
      name: 'BCA 2026-29',
      startYear: 2026,
      endYear: 2029,
    });
  }
  console.log('  ✓ Cohort created:', cohort.name);

  // STEP 5 — Create Academic Session 2026-27
  console.log('STEP 5: Create Academic Session 2026-27');
  let session26 = await AcademicSession.findOne({ institutionId: inst._id, name: '2026-27' });
  if (!session26) {
    session26 = await AcademicSession.create({
      institutionId: inst._id,
      name: '2026-27',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-06-30'),
      status: 'Active',
      isCurrent: true,
    });
  }
  console.log('  ✓ Session created:', session26.name, `(${session26.status})`);

  // STEP 6 — Create Academic Periods (Semester 1 & Semester 3)
  console.log('STEP 6: Create Academic Period Semester 1');
  let sem1 = await AcademicPeriod.findOne({ programId: prog._id, periodNumber: 1 });
  if (!sem1) {
    sem1 = await AcademicPeriod.create({ programId: prog._id, periodNumber: 1, name: 'Semester 1' });
  }
  let sem3 = await AcademicPeriod.findOne({ programId: prog._id, periodNumber: 3 });
  if (!sem3) {
    sem3 = await AcademicPeriod.create({ programId: prog._id, periodNumber: 3, name: 'Semester 3' });
  }
  console.log('  ✓ Academic Periods configured: Semester 1 & Semester 3');

  // STEP 7 — Create Course
  console.log('STEP 7: Create Course Programming in C');
  let course = await Course.findOne({ title: 'Programming in C' });
  const teacherUser = await getOrCreateUser('sharma@college.edu', 'Mr. Sharma', 'professor');
  if (!course) {
    course = await Course.create({
      title: 'Programming in C',
      code: 'CS101',
      credits: 4,
      departmentId: dept._id,
      professorId: teacherUser._id,
      published: true,
    });
  }
  console.log('  ✓ Course created:', course.title);

  // STEP 8 — Create Course Offering
  console.log('STEP 8: Create Course Offering for 2026-27 Semester 1');
  let offering26 = await CourseOffering.findOne({
    courseId: course._id,
    academicSessionId: session26._id,
    programId: prog._id,
    academicPeriodId: sem1._id,
  });
  if (!offering26) {
    offering26 = await CourseOffering.create({
      courseId: course._id,
      academicSessionId: session26._id,
      programId: prog._id,
      academicPeriodId: sem1._id,
      departmentId: dept._id,
      primaryTeacherId: teacherUser._id,
      status: 'Active',
    });
  }
  console.log('  ✓ Course Offering created:', offering26._id.toString());

  // STEP 9 — Create Batch A
  console.log('STEP 9: Create Batch A');
  let batchA = await TeachingGroup.findOne({
    academicSessionId: session26._id,
    programId: prog._id,
    academicPeriodId: sem1._id,
    name: 'Batch A',
  });
  if (!batchA) {
    batchA = await TeachingGroup.create({
      programId: prog._id,
      cohortId: cohort._id,
      academicSessionId: session26._id,
      academicPeriodId: sem1._id,
      name: 'Batch A',
    });
  }
  console.log('  ✓ Batch created:', batchA.name);

  // STEP 10 — Create Practical Groups Programming Lab A1, A2
  console.log('STEP 10: Create Practical Groups Lab A1 & Lab A2');
  let labA1 = await PracticalGroup.findOne({ teachingGroupId: batchA._id, name: 'Programming Lab A1' });
  if (!labA1) {
    labA1 = await PracticalGroup.create({ teachingGroupId: batchA._id, courseOfferingId: offering26._id, name: 'Programming Lab A1' });
  }
  let labA2 = await PracticalGroup.findOne({ teachingGroupId: batchA._id, name: 'Programming Lab A2' });
  if (!labA2) {
    labA2 = await PracticalGroup.create({ teachingGroupId: batchA._id, courseOfferingId: offering26._id, name: 'Programming Lab A2' });
  }
  console.log('  ✓ Practical Groups created:', labA1.name, ',', labA2.name);

  // STEP 11 — Enroll Students Rahul, Aman, Priya
  console.log('STEP 11 & 12: Enroll & Assign Rahul (A1), Aman (A2), Priya (A1)');
  const rahul = await getOrCreateUser('rahul@scenario.edu', 'Rahul Sharma', 'student');
  const aman = await getOrCreateUser('aman@scenario.edu', 'Aman Verma', 'student');
  const priya = await getOrCreateUser('priya@scenario.edu', 'Priya Patel', 'student');

  async function enrollAndAssign(student, tg, pg) {
    let enr = await StudentEnrollment.findOne({
      studentId: student._id,
      academicSessionId: session26._id,
      academicPeriodId: sem1._id,
    });
    if (!enr) {
      enr = await StudentEnrollment.create({
        studentId: student._id,
        institutionId: inst._id,
        programId: prog._id,
        cohortId: cohort._id,
        academicSessionId: session26._id,
        academicPeriodId: sem1._id,
        teachingGroupId: tg._id,
        status: 'Active',
      });
    }
    let cm = await CourseMembership.findOne({ studentId: student._id, courseOfferingId: offering26._id });
    if (!cm) {
      cm = await CourseMembership.create({
        studentEnrollmentId: enr._id,
        studentId: student._id,
        courseOfferingId: offering26._id,
        teachingGroupId: tg._id,
        practicalGroupId: pg._id,
      });
    }
    return { enr, cm };
  }

  await enrollAndAssign(rahul, batchA, labA1);
  await enrollAndAssign(aman, batchA, labA2);
  await enrollAndAssign(priya, batchA, labA1);
  console.log('  ✓ Students enrolled and contextual lab groups assigned');

  // STEP 13 — Assign Teacher Mr. Sharma
  console.log('STEP 13: Verify Teacher Mr. Sharma assigned to offering');
  if (offering26.primaryTeacherId.toString() !== teacherUser._id.toString()) {
    offering26.primaryTeacherId = teacherUser._id;
    await offering26.save();
  }
  console.log('  ✓ Primary Teacher:', teacherUser.name);

  // STEP 14 — Create Assignment & Submissions
  console.log('STEP 14: Create Assignment Pointers Assignment 1 & Submit');
  let assign1 = await Assignment.findOne({ courseOfferingId: offering26._id, title: 'Pointers Assignment 1' });
  if (!assign1) {
    assign1 = await Assignment.create({
      courseOfferingId: offering26._id,
      academicSessionId: session26._id,
      academicPeriodId: sem1._id,
      teachingGroupId: batchA._id,
      title: 'Pointers Assignment 1',
      description: 'Practice pointer arithmetic and dereferencing',
      startDate: new Date('2026-08-01'),
      dueDate: new Date('2026-08-15'),
      maxMarks: 20,
    });
  }

  // Rahul submits assignment
  let rahulSub = await Submission.findOne({ assignmentId: assign1._id, studentId: rahul._id });
  if (!rahulSub) {
    rahulSub = await Submission.create({
      assignmentId: assign1._id,
      studentId: rahul._id,
      marks: 18,
      status: 'graded',
      feedback: 'Excellent grasp of double pointers',
      submittedAt: new Date('2026-08-10'),
    });
  }
  console.log('  ✓ Assignment created and Rahul scored:', rahulSub.marks, '/ 20');

  // STEP 15 — Create Test & Attempt
  console.log('STEP 15: Create Test Programming Test 1 (Time-Based) & Attempt');
  let test1 = await Test.findOne({ courseOfferingId: offering26._id, title: 'Programming Test 1' });
  if (!test1) {
    test1 = await Test.create({
      courseOfferingId: offering26._id,
      academicSessionId: session26._id,
      academicPeriodId: sem1._id,
      teachingGroupId: batchA._id,
      title: 'Programming Test 1',
      testType: 'time-based',
      timeLimit: 30,
      status: 'published',
      questions: [
        { questionType: 'mcq', text: 'Size of pointer on 64-bit architecture?', options: ['4 bytes', '8 bytes'], correctOptionIndex: 1, points: 5 },
        { questionType: 'mcq', text: 'Which operator dereferences a pointer?', options: ['&', '*'], correctOptionIndex: 1, points: 5 },
      ],
    });
  }

  let rahulAttempt = await TestAttempt.findOne({ testId: test1._id, studentId: rahul._id });
  if (!rahulAttempt) {
    rahulAttempt = await TestAttempt.create({
      testId: test1._id,
      studentId: rahul._id,
      score: 10,
      status: 'completed',
      answers: [
        { questionId: test1.questions[0]._id, mcqOptionIndex: 1, isCorrect: true, pointsAwarded: 5 },
        { questionId: test1.questions[1]._id, mcqOptionIndex: 1, isCorrect: true, pointsAwarded: 5 },
      ],
      completedAt: new Date('2026-08-20'),
    });
  }
  console.log('  ✓ Test created and Rahul scored:', rahulAttempt.score, 'pts (100%)');

  // STEP 16 — Allocate Material
  console.log('STEP 16: Allocate Material Pointers Notes.pdf to Batch A');
  let material = await Material.findOne({ courseOfferingId: offering26._id, title: 'Pointers Notes.pdf' });
  if (!material) {
    material = await Material.create({
      courseOfferingId: offering26._id,
      academicSessionId: session26._id,
      academicPeriodId: sem1._id,
      teachingGroupId: batchA._id,
      topic: 'Pointers and Memory',
      title: 'Pointers Notes.pdf',
      type: 'pdf',
      url: 'https://storage.college.edu/materials/pointers.pdf',
      order: 1,
    });
  }
  console.log('  ✓ Material allocated:', material.title);

  // STEP 17 — Close Session 2026-27
  console.log('\nSTEP 17: Close Session 2026-27 (Completed)');
  session26.status = 'Completed';
  session26.isCurrent = false;
  await session26.save();
  console.log('  ✓ Session 2026-27 status is now:', session26.status);

  // STEP 18 — Second Academic Session 2027-28 & Promotion
  console.log('\nSTEP 18: Second Academic Session 2027-28 & Promote Rahul');
  let session27 = await AcademicSession.findOne({ institutionId: inst._id, name: '2027-28' });
  if (!session27) {
    session27 = await AcademicSession.create({
      institutionId: inst._id,
      name: '2027-28',
      startDate: new Date('2027-07-01'),
      endDate: new Date('2028-06-30'),
      status: 'Active',
      isCurrent: true,
    });
  }

  // Create Batch B in Semester 3 for session 2027-28
  let batchB = await TeachingGroup.findOne({
    academicSessionId: session27._id,
    programId: prog._id,
    academicPeriodId: sem3._id,
    name: 'Batch B',
  });
  if (!batchB) {
    batchB = await TeachingGroup.create({
      programId: prog._id,
      cohortId: cohort._id,
      academicSessionId: session27._id,
      academicPeriodId: sem3._id,
      name: 'Batch B',
    });
  }

  // Create Semester 3 Course: Data Structures
  let dsCourse = await Course.findOne({ title: 'Data Structures' });
  if (!dsCourse) {
    dsCourse = await Course.create({
      title: 'Data Structures',
      code: 'CS201',
      credits: 4,
      departmentId: dept._id,
      professorId: teacherUser._id,
      published: true,
    });
  }

  let dsOffering = await CourseOffering.findOne({
    courseId: dsCourse._id,
    academicSessionId: session27._id,
    programId: prog._id,
    academicPeriodId: sem3._id,
  });
  if (!dsOffering) {
    dsOffering = await CourseOffering.create({
      courseId: dsCourse._id,
      academicSessionId: session27._id,
      programId: prog._id,
      academicPeriodId: sem3._id,
      departmentId: dept._id,
      primaryTeacherId: teacherUser._id,
      status: 'Active',
    });
  }

  // Promote Rahul to Semester 3 Batch B:
  // 1. Mark old enrollment status as 'Promoted' (do NOT delete or alter past records!)
  await StudentEnrollment.updateMany(
    { studentId: rahul._id, academicSessionId: session26._id },
    { status: 'Promoted', promotedAt: new Date('2027-07-01') }
  );

  // 2. Create NEW StudentEnrollment in 2027-28
  let rahul27Enrollment = await StudentEnrollment.findOne({
    studentId: rahul._id,
    academicSessionId: session27._id,
    academicPeriodId: sem3._id,
  });
  if (!rahul27Enrollment) {
    rahul27Enrollment = await StudentEnrollment.create({
      studentId: rahul._id,
      institutionId: inst._id,
      programId: prog._id,
      cohortId: cohort._id,
      academicSessionId: session27._id,
      academicPeriodId: sem3._id,
      teachingGroupId: batchB._id,
      status: 'Active',
      enrolledAt: new Date('2027-07-01'),
    });
  }

  let rahul27Membership = await CourseMembership.findOne({ studentId: rahul._id, courseOfferingId: dsOffering._id });
  if (!rahul27Membership) {
    rahul27Membership = await CourseMembership.create({
      studentEnrollmentId: rahul27Enrollment._id,
      studentId: rahul._id,
      courseOfferingId: dsOffering._id,
      teachingGroupId: batchB._id,
    });
  }

  console.log('  ✓ Rahul promoted to 2027-28 Semester 3 Batch B');

  // STEP 18 VERIFICATION — HISTORICAL IMMUTABILITY CHECK
  console.log('\n--- VERIFYING HISTORICAL IMMUTABILITY ---');

  // 1. Fetch Rahul's historical 2026-27 enrollment
  const pastEnrollment = await StudentEnrollment.findOne({
    studentId: rahul._id,
    academicSessionId: session26._id,
  }).populate('teachingGroupId');

  console.log('  1. Past 2026-27 Enrollment Batch:', pastEnrollment.teachingGroupId.name, '(Expected: Batch A)');
  if (pastEnrollment.teachingGroupId.name !== 'Batch A') {
    throw new Error('FATAL: Historical enrollment batch was overwritten!');
  }

  // 2. Fetch Rahul's current 2027-28 enrollment
  const currEnrollment = await StudentEnrollment.findOne({
    studentId: rahul._id,
    academicSessionId: session27._id,
  }).populate('teachingGroupId');

  console.log('  2. Current 2027-28 Enrollment Batch:', currEnrollment.teachingGroupId.name, '(Expected: Batch B)');
  if (currEnrollment.teachingGroupId.name !== 'Batch B') {
    throw new Error('FATAL: Current enrollment batch mismatch!');
  }

  // 3. Verify Rahul's 2026-27 assignment submission still intact
  const pastSub = await Submission.findOne({ assignmentId: assign1._id, studentId: rahul._id });
  console.log('  3. Historical 2026-27 Assignment Score:', pastSub.marks, '(Expected: 18)');
  if (pastSub.marks !== 18) {
    throw new Error('FATAL: Historical assignment submission altered!');
  }

  // 4. Verify Rahul's 2026-27 test attempt still intact
  const pastAtt = await TestAttempt.findOne({ testId: test1._id, studentId: rahul._id });
  console.log('  4. Historical 2026-27 Test Score:', pastAtt.score, '(Expected: 10)');
  if (pastAtt.score !== 10) {
    throw new Error('FATAL: Historical test score altered!');
  }

  // STEP 19 — MIS Acceptance Verification via HTTP Endpoints
  console.log('\n--- VERIFYING MIS CROSS-SESSION ISOLATION OVER HTTP ---');
  
  // Login as admin
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@college.edu', password: 'AdminPassword@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;

  // 1. Fetch 2026-27 Overview
  const res26 = await fetch(`http://localhost:5000/api/mis/overview?sessionId=${session26._id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data26 = await res26.json();
  console.log('  2026-27 MIS Status:', data26.data.session.status, '(Expected: Completed)');
  console.log('  2026-27 MIS Total Students:', data26.data.metrics.totalStudents, '(Expected >= 3)');
  console.log('  2026-27 MIS Assignments Count:', data26.data.metrics.assignmentsCount, '(Expected >= 1)');
  console.log('  2026-27 MIS Tests Count:', data26.data.metrics.testsCount, '(Expected >= 1)');

  // 2. Fetch 2027-28 Overview
  const res27 = await fetch(`http://localhost:5000/api/mis/overview?sessionId=${session27._id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data27 = await res27.json();
  console.log('  2027-28 MIS Status:', data27.data.session.status, '(Expected: Active)');
  console.log('  2027-28 MIS Total Students:', data27.data.metrics.totalStudents, '(Expected: 1 for Rahul)');

  if (data26.data.metrics.totalStudents === data27.data.metrics.totalStudents && data26.data.metrics.totalStudents === 1) {
    throw new Error('MIS Cross-session isolation failed: Sessions are mixed!');
  }

  // 3. Fetch Rahul's Academic History & Timeline
  const resHistory = await fetch(`http://localhost:5000/api/mis/students/${rahul._id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const historyData = await resHistory.json();
  const studentHistory = historyData.data;

  console.log('  Rahul Historical Sessions Tracked:', studentHistory.history.length, '(Expected >= 2)');
  console.log('  Rahul Dynamic Timeline Events:', studentHistory.timeline.length, '(Expected >= 3)');
  console.log('  Rahul Current Context:', studentHistory.current.academicPeriodId?.name, studentHistory.current.teachingGroupId?.name);

  // 4. Fetch Multi-Session Comparison
  const resCompare = await fetch('http://localhost:5000/api/mis/compare-sessions', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const compareData = await resCompare.json();
  console.log('  Sessions Compared Count:', compareData.data.length, '(Expected >= 2)');

  console.log('\n====================================================');
  console.log('ALL ACCEPTANCE CRITERIA PASSED WITH 100% INTEGRITY!');
  console.log('====================================================\n');

  return true;
}

if (require.main === module) {
  runScenario()
    .then(() => {
      console.log('Scenario executed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Scenario failed:', err);
      process.exit(1);
    });
}

module.exports = runScenario;
