const path = require('node:path');
const fs = require('node:fs');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
require('../src/models');
async function database() {
  // Always launch a disposable local replica set. Never read MONGODB_URI/.env.
  const cache = path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server');
  const cached = fs.existsSync(cache) && fs.readdirSync(cache).find(name => /^mongod-.*8\.2\.6(?:\.exe)?$/.test(name));
  const binary = { version: '8.2.6', downloadDir: path.resolve(__dirname, '../.test-binaries'), ...(cached ? { systemBinary: path.join(cache, cached) } : {}) };
  const repl = await MongoMemoryReplSet.create({ binary, instanceOpts: [{ launchTimeout: 60000 }], replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(repl.getUri(), { dbName: 'skillbery_isolated_tests', maxPoolSize: 30 });
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  return async () => { await mongoose.disconnect(); await repl.stop(); };
}
async function seed() {
  const M = mongoose.models;
  const password = 'Synthetic123!';
  const [admin, teacher, studentA, studentB] = await M.User.create([
    { name: 'Synthetic Admin', email: 'admin@example.test', password, role: 'admin' },
    { name: 'Synthetic Teacher', email: 'teacher@example.test', password, role: 'teacher' },
    { name: 'Student A', email: 'a@example.test', password, role: 'student' },
    { name: 'Student B', email: 'b@example.test', password, role: 'student' },
  ]);
  const institution = await M.Institution.create({ name: 'Synthetic College', code: 'TEST' });
  const program = await M.Program.create({ name: 'BCA', code: 'BCA', institutionId: institution._id });
  const academicSession = await M.AcademicSession.create({ name: '2026-27', institutionId: institution._id, status: 'Active', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') });
  const periods = await M.AcademicPeriod.create([4,5,6].map(n => ({ name: 'Semester '+n, periodNumber: n, programId: program._id })));
  const cohort = await M.AdmissionCohort.create({ name: '2024 Intake', startYear: 2024, endYear: 2027, programId: program._id, institutionId: institution._id });
  const course = await M.Course.create({ title: 'Synthetic Computing', professorId: teacher._id, published: true });
  const groups = [], classrooms = [], invitations = [];
  for (const [i, student] of [studentA,studentB].entries()) {
    const group = await M.TeachingGroup.create({ name: 'Batch '+(i ? 'B':'A'), programId: program._id, cohortId: cohort._id, academicSessionId: academicSession._id, academicPeriodId: periods[0]._id });
    const offering = await M.CourseOffering.create({ courseId: course._id, programId: program._id, academicSessionId: academicSession._id, academicPeriodId: periods[0]._id, teachingGroupId: group._id, primaryTeacherId: teacher._id });
    const classroom = await M.Classroom.create({ courseId: course._id, courseOfferingId: offering._id, teachingGroupId: group._id, professorId: teacher._id, session: academicSession.name, classBatch: i?'B':'A', type: 'theory' });
    await M.Enrollment.create({ studentId: student._id, courseId: course._id, classroomId: classroom._id });
    await M.StudentEnrollment.create({ studentId: student._id, institutionId: institution._id, programId: program._id, cohortId: cohort._id, academicSessionId: academicSession._id, academicPeriodId: periods[0]._id, teachingGroupId: group._id });
    invitations.push(await M.BatchJoinCode.create({ code: 'INVITE'+i, session: academicSession.name, classBatch: i?'B':'A', teachingGroupId: group._id, programId: program._id, expiresAt: new Date(Date.now()+86400000), allowedEmails: ['new@example.test'] }));
    classrooms.push(classroom); groups.push(group);
  }
  return { admin,teacher,studentA,studentB,institution,program,academicSession,periods,cohort,course,groups,classrooms,invitations,password };
}
module.exports = { database, seed };
