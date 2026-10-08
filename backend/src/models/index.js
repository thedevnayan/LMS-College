const mongoose = require('mongoose');

// Import all models to ensure they are registered with Mongoose
const Institution = require('./Institution');
const Department = require('./Department');
const Program = require('./Program');
const AcademicSession = require('./AcademicSession');
const AcademicPeriod = require('./AcademicPeriod');
const AdmissionCohort = require('./AdmissionCohort');
const Course = require('./Course');
const CourseOffering = require('./CourseOffering');
const TeachingGroup = require('./TeachingGroup');
const PracticalGroup = require('./PracticalGroup');
const StudentEnrollment = require('./StudentEnrollment');
const CourseMembership = require('./CourseMembership');
const AuditLog = require('./AuditLog');
const User = require('./User');
const Classroom = require('./Classroom');
const Enrollment = require('./Enrollment');
const Assignment = require('./Assignment');
const Submission = require('./Submission');
const Test = require('./Test');
const TestAttempt = require('./TestAttempt');
const Material = require('./Material');
const MaterialProgress = require('./MaterialProgress');
const Module = require('./Module');
const Quiz = require('./Quiz');
const QuizAttempt = require('./QuizAttempt');
const Batch = require('./Batch');
const Curriculum = require('./Curriculum');
const FacultyAllocation = require('./FacultyAllocation');
const BatchJoinCode = require('./BatchJoinCode');

module.exports = {
  Institution,
  Department,
  Program,
  AcademicSession,
  AcademicPeriod,
  AdmissionCohort,
  Course,
  CourseOffering,
  TeachingGroup,
  PracticalGroup,
  StudentEnrollment,
  CourseMembership,
  AuditLog,
  User,
  Classroom,
  Enrollment,
  Assignment,
  Submission,
  Test,
  TestAttempt,
  Material,
  MaterialProgress,
  Module,
  Quiz,
  QuizAttempt,
  Batch,
  Curriculum,
  FacultyAllocation,
  BatchJoinCode,
};
