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
const AuditLog = require('../models/AuditLog');

const User = require('../models/User');
const Course = require('../models/Course');
const Classroom = require('../models/Classroom');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const Material = require('../models/Material');

async function runMigration() {
  console.log('--- Starting Safe College LMS + MIS Migration ---');
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-college';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB at', mongoUri);
  }

  // 1. Ensure Default Institution
  let institution = await Institution.findOne({ code: 'ABC-CET' });
  if (!institution) {
    institution = await Institution.create({
      name: 'ABC College of Engineering & Technology',
      code: 'ABC-CET',
      address: 'Knowledge Campus, University Road',
      contactEmail: 'admin@abccollege.edu',
      website: 'https://abccollege.edu',
      isActive: true,
    });
    console.log('[Migration] Created Institution:', institution.name);
  } else {
    console.log('[Migration] Existing Institution found:', institution.name);
  }

  // 2. Ensure Default Department
  let department = await Department.findOne({ institutionId: institution._id, code: 'CSE' });
  if (!department) {
    department = await Department.create({
      institutionId: institution._id,
      name: 'Department of Computer Science & Engineering',
      code: 'CSE',
      isActive: true,
    });
    console.log('[Migration] Created Department:', department.name);
  } else {
    console.log('[Migration] Existing Department found:', department.name);
  }

  // 3. Ensure Default Program (BCA)
  let program = await Program.findOne({ institutionId: institution._id, code: 'BCA' });
  if (!program) {
    program = await Program.create({
      institutionId: institution._id,
      departmentId: department._id,
      name: 'Bachelor of Computer Applications',
      code: 'BCA',
      degreeType: 'Undergraduate',
      durationYears: 3,
      totalPeriods: 6,
      periodType: 'Semester',
      isActive: true,
    });
    console.log('[Migration] Created Program:', program.name);
  } else {
    console.log('[Migration] Existing Program found:', program.name);
  }

  // 4. Ensure Academic Periods for Program (Semester 1 to 6)
  const periods = [];
  for (let i = 1; i <= 6; i++) {
    let period = await AcademicPeriod.findOne({ programId: program._id, periodNumber: i });
    if (!period) {
      period = await AcademicPeriod.create({
        programId: program._id,
        periodNumber: i,
        name: `Semester ${i}`,
        isActive: true,
      });
      console.log(`[Migration] Created Period: Semester ${i}`);
    }
    periods.push(period);
  }
  const sem1 = periods[0];
  const sem3 = periods[2];

  // 5. Ensure Admission Cohort (BCA 2026-29)
  let cohort = await AdmissionCohort.findOne({ programId: program._id, name: 'BCA 2026-29' });
  if (!cohort) {
    cohort = await AdmissionCohort.create({
      institutionId: institution._id,
      programId: program._id,
      name: 'BCA 2026-29',
      startYear: 2026,
      endYear: 2029,
      status: 'Active',
    });
    console.log('[Migration] Created Cohort:', cohort.name);
  } else {
    console.log('[Migration] Existing Cohort found:', cohort.name);
  }

  // 6. Ensure Academic Session (2026-27)
  let session2627 = await AcademicSession.findOne({ institutionId: institution._id, name: '2026-27' });
  if (!session2627) {
    session2627 = await AcademicSession.create({
      institutionId: institution._id,
      name: '2026-27',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-06-30'),
      status: 'Active',
      isCurrent: true,
    });
    console.log('[Migration] Created Academic Session: 2026-27 (Active)');
  } else {
    console.log('[Migration] Existing Academic Session found: 2026-27');
  }

  // 7. Ensure Admin User
  let adminUser = await User.findOne({ email: 'admin@college.edu' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'College Administrator',
      email: 'admin@college.edu',
      password: 'AdminPassword@123',
      role: 'admin',
      isActive: true,
      isVerified: true,
    });
    console.log('[Migration] Created default Admin User: admin@college.edu / AdminPassword@123');
  }

  // 8. Enrich existing courses with department and code if missing
  const existingCourses = await Course.find({});
  for (const c of existingCourses) {
    let changed = false;
    if (!c.departmentId) {
      c.departmentId = department._id;
      changed = true;
    }
    if (!c.code) {
      const initials = c.title.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 4) || 'CS';
      c.code = `${initials}101`;
      changed = true;
    }
    if (changed) {
      await c.save();
      console.log(`[Migration] Enriched Course '${c.title}' with code ${c.code}`);
    }
  }

  // 9. Inspect existing classrooms and map them to TeachingGroups, PracticalGroups, and CourseOfferings
  const existingClassrooms = await Classroom.find({});
  console.log(`[Migration] Processing ${existingClassrooms.length} existing classrooms...`);

  for (const cls of existingClassrooms) {
    // Determine batch name e.g. "Batch A", "Batch C"
    const batchName = `Batch ${cls.classBatch || 'A'}`;

    // Find or create TeachingGroup
    let tg = await TeachingGroup.findOne({
      academicSessionId: session2627._id,
      programId: program._id,
      academicPeriodId: sem1._id,
      name: batchName,
    });

    if (!tg) {
      tg = await TeachingGroup.create({
        programId: program._id,
        cohortId: cohort._id,
        academicSessionId: session2627._id,
        academicPeriodId: sem1._id,
        name: batchName,
      });
      console.log(`[Migration] Created Teaching Group: ${batchName}`);
    }

    // If lab, find or create PracticalGroup
    let pg = null;
    if (cls.type === 'lab' && cls.labBatch) {
      const pgName = `Practical ${cls.labBatch}`;
      pg = await PracticalGroup.findOne({
        teachingGroupId: tg._id,
        name: pgName,
      });
      if (!pg) {
        pg = await PracticalGroup.create({
          teachingGroupId: tg._id,
          name: pgName,
        });
        console.log(`[Migration] Created Practical Group: ${pgName} under ${batchName}`);
      }
    }

    // Find or create CourseOffering
    let offering = await CourseOffering.findOne({
      courseId: cls.courseId,
      academicSessionId: session2627._id,
      programId: program._id,
      academicPeriodId: sem1._id,
    });

    if (!offering) {
      offering = await CourseOffering.create({
        courseId: cls.courseId,
        academicSessionId: session2627._id,
        programId: program._id,
        academicPeriodId: sem1._id,
        departmentId: department._id,
        primaryTeacherId: cls.professorId,
        status: 'Active',
        classroomId: cls._id,
      });
      console.log(`[Migration] Created Course Offering for Classroom ${cls.joinCode}`);
    } else if (!offering.classroomId) {
      offering.classroomId = cls._id;
      await offering.save();
    }

    // Enrich assignments in this classroom with academic context
    const enrichedAssignments = await Assignment.updateMany(
      { classroomId: cls._id, academicSessionId: null },
      {
        $set: {
          academicSessionId: session2627._id,
          courseOfferingId: offering._id,
          academicPeriodId: sem1._id,
          teachingGroupId: tg._id,
          practicalGroupId: pg ? pg._id : null,
        }
      }
    );
    if (enrichedAssignments.modifiedCount > 0) {
      console.log(`[Migration] Enriched ${enrichedAssignments.modifiedCount} assignments for classroom ${cls.joinCode}`);
    }

    // Enrich tests in this classroom with academic context
    const enrichedTests = await Test.updateMany(
      { classroomId: cls._id, academicSessionId: null },
      {
        $set: {
          academicSessionId: session2627._id,
          courseOfferingId: offering._id,
          academicPeriodId: sem1._id,
          teachingGroupId: tg._id,
          practicalGroupId: pg ? pg._id : null,
        }
      }
    );
    if (enrichedTests.modifiedCount > 0) {
      console.log(`[Migration] Enriched ${enrichedTests.modifiedCount} tests for classroom ${cls.joinCode}`);
    }

    // Enrich materials in this classroom with academic context
    const enrichedMaterials = await Material.updateMany(
      { classroomId: cls._id, academicSessionId: null },
      {
        $set: {
          academicSessionId: session2627._id,
          courseOfferingId: offering._id,
          academicPeriodId: sem1._id,
          teachingGroupId: tg._id,
          practicalGroupId: pg ? pg._id : null,
        }
      }
    );
    if (enrichedMaterials.modifiedCount > 0) {
      console.log(`[Migration] Enriched ${enrichedMaterials.modifiedCount} materials for classroom ${cls.joinCode}`);
    }
  }

  // 10. Inspect existing Enrollments and create StudentEnrollment & CourseMembership
  const existingEnrollments = await Enrollment.find({});
  console.log(`[Migration] Processing ${existingEnrollments.length} existing student enrollments...`);

  for (const e of existingEnrollments) {
    const cls = e.classroomId ? await Classroom.findById(e.classroomId) : null;
    const batchName = cls ? `Batch ${cls.classBatch}` : 'Batch A';

    const tg = await TeachingGroup.findOne({
      academicSessionId: session2627._id,
      programId: program._id,
      academicPeriodId: sem1._id,
      name: batchName,
    });

    if (!tg) continue;

    let se = await StudentEnrollment.findOne({
      studentId: e.studentId,
      academicSessionId: session2627._id,
      academicPeriodId: sem1._id,
    });

    if (!se) {
      se = await StudentEnrollment.create({
        studentId: e.studentId,
        institutionId: institution._id,
        programId: program._id,
        cohortId: cohort._id,
        academicSessionId: session2627._id,
        academicPeriodId: sem1._id,
        teachingGroupId: tg._id,
        status: 'Active',
        enrolledAt: e.enrolledAt || new Date(),
      });
      console.log(`[Migration] Created StudentEnrollment for student ${e.studentId}`);
    }

    // Find course offering
    const offering = await CourseOffering.findOne({
      courseId: e.courseId,
      academicSessionId: session2627._id,
    });

    if (offering) {
      let cm = await CourseMembership.findOne({
        studentId: e.studentId,
        courseOfferingId: offering._id,
      });

      if (!cm) {
        let pg = null;
        if (e.labBatch) {
          pg = await PracticalGroup.findOne({
            teachingGroupId: tg._id,
            name: `Practical ${e.labBatch}`,
          });
        }

        cm = await CourseMembership.create({
          studentEnrollmentId: se._id,
          studentId: e.studentId,
          courseOfferingId: offering._id,
          teachingGroupId: tg._id,
          practicalGroupId: pg ? pg._id : null,
          status: 'Enrolled',
        });
        console.log(`[Migration] Created CourseMembership for student ${e.studentId}`);
      }
    }
  }

  // 11. Verification Counts
  const counts = {
    institutions: await Institution.countDocuments(),
    departments: await Department.countDocuments(),
    programs: await Program.countDocuments(),
    academicSessions: await AcademicSession.countDocuments(),
    academicPeriods: await AcademicPeriod.countDocuments(),
    admissionCohorts: await AdmissionCohort.countDocuments(),
    courseOfferings: await CourseOffering.countDocuments(),
    teachingGroups: await TeachingGroup.countDocuments(),
    practicalGroups: await PracticalGroup.countDocuments(),
    studentEnrollments: await StudentEnrollment.countDocuments(),
    courseMemberships: await CourseMembership.countDocuments(),
    existingUsers: await User.countDocuments(),
    existingCourses: await Course.countDocuments(),
    existingClassrooms: await Classroom.countDocuments(),
    existingAssignments: await Assignment.countDocuments(),
    existingSubmissions: await Submission.countDocuments(),
    existingTests: await Test.countDocuments(),
    existingTestAttempts: await TestAttempt.countDocuments(),
    existingMaterials: await Material.countDocuments(),
  };

  console.log('\n--- Migration Completed Successfully ---');
  console.log('Entity Counts Summary:', JSON.stringify(counts, null, 2));

  return counts;
}

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration script finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}

module.exports = runMigration;
