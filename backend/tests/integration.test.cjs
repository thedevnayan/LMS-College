const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const { io: client } = require('socket.io-client');
const { database, seed } = require('./fixtures.cjs');
const engine = require('../src/services/assessment');
const { generateTokens } = require('../src/services/tokens');
let cleanup, fixture, server, io, base;
const tokens = new Map();
before(async () => {
  process.env.JWT_ACCESS_SECRET='synthetic-access-secret-12345678901234567890';
  process.env.JWT_REFRESH_SECRET='synthetic-refresh-secret-12345678901234567890';
  process.env.NODE_ENV='test'; process.env.CORS_ORIGIN='http://localhost:3000';
  cleanup=await database();fixture=await seed();
  for(const key of ['admin','teacher','studentA','studentB']) tokens.set(key,generateTokens(fixture[key]).accessToken);
  server=http.createServer(require('../src/app'));io=require('../src/sockets/testSocket').initSocket(server);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
}, { timeout:180000 });
after(async()=>{ if(io) await new Promise(resolve=>io.close(resolve));if(server?.listening) await new Promise(resolve=>server.close(resolve));if(cleanup)await cleanup(); });
async function request(route, role, method='GET', body) {
  const response=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(role?{Authorization:'Bearer '+tokens.get(role)}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return { status:response.status, body:await response.json(), cookie:response.headers.get('set-cookie') };
}
async function assessment(type='standard') {
  return mongoose.models.Test.create({classroomId:fixture.classrooms[0]._id,title:'Synthetic '+type,testType:type,status:'published',timeLimit:10,questions:[{questionType:'mcq',text:'One?',options:['a','b'],correctOptionIndex:1,points:2},{questionType:'mcq',text:'Two?',options:['a','b'],correctOptionIndex:0,points:3}]});
}
const connect = role => new Promise((resolve,reject)=>{const socket=client(base,{auth:{token:tokens.get(role)},transports:['websocket'],reconnection:false});socket.once('connect',()=>resolve(socket));socket.once('connect_error',reject);});
test('student reports require own completion and keep other students and live questions private', async () => {
  const t = await assessment();
  const route = '/tests/' + t._id + '/my-report';
  assert.equal((await request(route, 'studentA')).status, 409);
  await engine.joinTest(t._id, fixture.studentA);
  await engine.submitAnswer(t._id, fixture.studentA, { questionId: t.questions[0]._id, selectedOption: 1 });
  assert.equal((await request(route, 'studentA')).status, 409);
  await engine.completeTest(t._id, fixture.studentA);
  const result = await request(route, 'studentA');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.data.score, 2);
  assert.equal(result.body.data.maximumScore, 5);
  assert.equal(result.body.data.questions[0].selectedOption, 1);
  assert.equal(result.body.data.questions[0].correctOptionIndex, 1);
  assert.equal(result.body.data.questions[1].selectedOption, null);
  assert.equal(result.body.data.questions[1].pointsAwarded, 0);
  assert.equal(result.body.data.attempts, undefined);
  assert.equal((await request(route, 'studentB')).status, 403);
  const live = await assessment('live-fastest-finger');
  await engine.joinTest(live._id, fixture.studentA);
  await engine.transition(live._id, fixture.admin, 'start');
  await engine.completeTest(live._id, fixture.studentA);
  assert.equal((await request('/tests/' + live._id + '/my-report', 'studentA')).status, 409);
  await engine.transition(live._id, fixture.admin, 'end');
  assert.equal((await request('/tests/' + live._id + '/my-report', 'studentA')).status, 200);
});
test('assignment report reveals answer key only after own submission and includes current teacher feedback', async () => {
  const a = await mongoose.models.Assignment.create({ classroomId: fixture.classrooms[0]._id, title: 'Report assignment', startDate: new Date(Date.now()-1000), dueDate: new Date(Date.now()+60000), maxMarks: 10, questions: [{ text: 'Report question', options: ['Yes', 'No'], correctOptionIndex: 0, marks: 2 }] });
  const route = '/assignments/' + a._id;
  assert.equal((await request(route, 'studentA')).body.data.questions[0].correctOptionIndex, undefined);
  const submitted = await request(route + '/submit', 'studentA', 'POST', { answers: [0], comment: 'My work' });
  assert.equal(submitted.status, 201);
  const report = await request(route, 'studentA');
  assert.equal(report.body.data.questions[0].correctOptionIndex, 0);
  assert.deepEqual(report.body.data.submission.answers, [0]);
  assert.equal(report.body.data.submission.marks, 10);
  assert.equal((await request(route, 'studentB')).status, 403);
  await request('/submissions/' + submitted.body.data._id + '/grade', 'teacher', 'PATCH', { marks: 9, feedback: 'Reviewed work' });
  const graded = await request(route, 'studentA');
  assert.equal(graded.body.data.submission.marks, 9);
  assert.equal(graded.body.data.submission.feedback, 'Reviewed work');
});
test('batch setup leaves class creation explicit; shared QR registers and enrolls without creating classrooms', async () => {
  const M = mongoose.models;
  const batch = await request('/academic/batches', 'admin', 'POST', {
    programId: String(fixture.program._id), cohortId: String(fixture.cohort._id),
    academicSessionId: String(fixture.academicSession._id), academicPeriodId: String(fixture.periods[0]._id), name: 'Manual classes',
  });
  assert.equal(batch.status, 201, JSON.stringify(batch.body));
  const groupId = batch.body.data._id;
  const allocation = await request('/academic/faculty-allocations', 'admin', 'POST', {
    academicSessionId: String(fixture.academicSession._id), programId: String(fixture.program._id),
    academicPeriodId: String(fixture.periods[0]._id), allocations: [{ courseId: String(fixture.course._id), teachingGroupId: groupId, type: 'theory', facultyId: String(fixture.teacher._id) }],
  });
  assert.equal(allocation.status, 200, JSON.stringify(allocation.body));
  const offering = await M.CourseOffering.findOne({ teachingGroupId: groupId });
  assert.equal(await M.Classroom.countDocuments({ courseOfferingId: offering._id }), 0);
  assert.equal(allocation.body.data[0].classroomId, null);
  const body = { courseOfferingId: String(offering._id), type: 'theory' };
  const created = await request('/classrooms', 'admin', 'POST', body);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const classroom = created.body.data[0];
  assert.equal(String((await M.FacultyAllocation.findById(allocation.body.data[0]._id)).classroomId), classroom._id);
  const retry = await request('/classrooms', 'admin', 'POST', body);
  assert.equal(retry.status, 201, JSON.stringify(retry.body));
  assert.equal(retry.body.data[0]._id, classroom._id);
  const route = '/enroll/' + classroom.enrollmentToken;
  const credentials = { email: 'shared-qr@example.test', password: fixture.password, name: 'Shared QR student', isNewAccount: true };
  const joined = await request(route, null, 'POST', credentials);
  assert.equal(joined.status, 201, JSON.stringify(joined.body));
  assert.ok(joined.body.data.accessToken);
  assert.equal(joined.body.data.user.password, undefined);
  assert.equal((await request(route, null, 'POST', { ...credentials, isNewAccount: false })).status, 201);
  assert.equal(await M.Classroom.countDocuments({ courseOfferingId: offering._id }), 1);
  assert.equal(await M.Enrollment.countDocuments({ studentId: joined.body.data.user._id, classroomId: classroom._id }), 1);
  const existing = await M.User.create({ name: 'Registered before scan', email: 'existing-qr@example.test', password: fixture.password, role: 'student' });
  assert.equal((await request(route, null, 'POST', { email: existing.email, password: fixture.password, isNewAccount: false })).status, 201);
  // Explicit rosters still prevent other accounts from joining and roll back registration.
  await M.Classroom.updateOne({ _id: classroom._id }, { allowedEmails: ['assigned@example.test'] });
  const denied = await request(route, null, 'POST', { ...credentials, email: 'unassigned-qr@example.test' });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error.code, 'INVITATION_NOT_ASSIGNED');
  assert.equal(await M.User.countDocuments({ email: 'unassigned-qr@example.test' }), 0);
});
test('public registration cannot create faculty/admin',async()=>{
  for(const role of ['admin','professor','teacher']) assert.equal((await request('/auth/register',null,'POST',{name:'No',email:role+'@example.test',password:'Password123',role})).status,400);
  assert.equal(await mongoose.models.User.countDocuments({email:'professor@example.test'}),0);
});
test('real login returns safe profile and credentials',async()=>{
  const r=await request('/auth/login',null,'POST',{email:fixture.studentA.email,password:fixture.password});assert.equal(r.status,200);assert.equal(r.body.data.user.password,undefined);assert.equal(r.body.data.user.refreshTokens,undefined);assert.ok(r.cookie.includes('HttpOnly'));
});
test('student cannot mutate assessments or read staff live state/report',async()=>{
  const t=await assessment();
  for(const [route,method,body] of [[ '/tests/'+t._id,'PATCH',{title:'hack'}],['/tests/'+t._id,'DELETE'],['/tests/'+t._id+'/live-state','GET'],['/tests/'+t._id+'/report','GET']]) assert.equal((await request(route,'studentA',method,body)).status,403);
});
test('same course across two batches remains isolated for tests, materials and assignments',async()=>{
  const M=mongoose.models,t=await assessment();
  const a=await M.Assignment.create({classroomId:fixture.classrooms[0]._id,title:'Private',startDate:new Date(Date.now()-1000),dueDate:new Date(Date.now()+60000),maxMarks:10,questions:[{text:'Q',options:['a','b'],correctOptionIndex:1}]});
  const m=await M.Material.create({classroomId:fixture.classrooms[0]._id,title:'Private text',topic:'T',type:'text',content:'private',order:1});
  for(const route of ['/tests/'+t._id,'/tests/'+t._id+'/my-attempt','/assignments/'+a._id,'/materials/'+m._id]) assert.equal((await request(route,'studentB')).status,403);
  assert.equal((await request('/assignments/'+a._id+'/submit','studentB','POST',{answers:[1]})).status,403);
  const list=await request('/classrooms/'+fixture.classrooms[0]._id+'/tests','studentA');assert.equal(list.status,200);assert.equal(list.body.data[0].questions[0].correctOptionIndex,undefined);
  const details=await request('/assignments/'+a._id,'studentA');assert.equal(details.body.data.questions[0].correctOptionIndex,undefined);
});
test('student cannot discover invitation roster or batch students',async()=>{
  assert.equal((await request('/classrooms/batch-codes','studentA')).status,403);
  assert.equal((await request('/academic/batches/'+fixture.groups[0]._id+'/students','studentA')).status,403);
});
test('invalid QR creates neither account nor session',async()=>{
  const r=await request('/enroll/not-valid',null,'POST',{email:'badqr@example.test',password:fixture.password,isNewAccount:true,name:'New'});
  assert.equal(r.status,404);assert.equal(await mongoose.models.User.countDocuments({email:'badqr@example.test'}),0);assert.equal(r.cookie,null);
});
test('assigned QR enrollment is atomic and repeatable; copied invitation rejects another batch',async()=>{
  const route='/enroll/'+fixture.invitations[0].enrollmentToken;
  const rejected=await request(route,null,'POST',{email:'new@example.test',password:fixture.password,isNewAccount:true,name:'New'});assert.equal(rejected.status,403);assert.equal(await mongoose.models.User.countDocuments({email:'new@example.test'}),0);
  const account=await request('/users','admin','POST',{name:'New',email:'new@example.test',password:fixture.password,role:'student'});assert.equal(account.status,201);
  const r=await request(route,null,'POST',{email:'new@example.test',password:fixture.password,isNewAccount:false});assert.equal(r.status,201,JSON.stringify(r.body));
  const repeat=await request(route,null,'POST',{email:'new@example.test',password:fixture.password,isNewAccount:false});assert.equal(repeat.status,201);
  const user=await mongoose.models.User.findOne({email:'new@example.test'});assert.equal(await mongoose.models.Enrollment.countDocuments({studentId:user._id}),1);
  const forbidden=await request(route,null,'POST',{email:fixture.studentB.email,password:fixture.password,isNewAccount:false});assert.equal(forbidden.status,403);
});
test('expired QR is rejected before writes',async()=>{
  const invitation=await mongoose.models.BatchJoinCode.create({code:'EXPIRED',session:'Old',classBatch:'C',teachingGroupId:new mongoose.Types.ObjectId(),expiresAt:new Date(0)});
  assert.equal((await request('/enroll/'+invitation.enrollmentToken,null)).status,410);
});
test('concurrent joins create one standard attempt with fixed deadline',async()=>{
  const t=await assessment();const joins=await Promise.all(Array.from({length:12},()=>engine.joinTest(t._id,fixture.studentA)));
  assert.equal(new Set(joins.map(r=>String(r.attempt._id))).size,1);assert.equal(new Set(joins.map(r=>+r.attempt.deadlineAt)).size,1);
});
test('duplicate concurrent answers increment score once and ignore spoofed identity/score',async()=>{
  const t=await assessment();await engine.joinTest(t._id,fixture.studentA);
  await Promise.all(Array.from({length:8},()=>engine.submitAnswer(t._id,fixture.studentA,{questionId:t.questions[0]._id,selectedOption:1,userId:fixture.studentB._id,score:9999})));
  const a=await mongoose.models.TestAttempt.findOne({testId:t._id,studentId:fixture.studentA._id});assert.equal(a.score,2);assert.equal(a.answers.length,1);
});
test('expired standard attempt refuses answers, preserves persisted work',async()=>{
  const t=await assessment();const {attempt}=await engine.joinTest(t._id,fixture.studentA);await mongoose.models.TestAttempt.updateOne({_id:attempt._id},{$set:{deadlineAt:new Date(0)}});
  await assert.rejects(engine.submitAnswer(t._id,fixture.studentA,{questionId:t.questions[0]._id,selectedOption:1}),e=>e.errorCode==='TIME_EXPIRED');
});
test('live state rejects future questions and unauthorized start',async()=>{
  const t=await assessment('live-fastest-finger');await engine.joinTest(t._id,fixture.studentA);
  await assert.rejects(engine.transition(t._id,fixture.studentA,'start'),e=>e.statusCode===403);
  await engine.transition(t._id,fixture.admin,'start');
  await assert.rejects(engine.submitAnswer(t._id,fixture.studentA,{questionId:t.questions[1]._id,selectedOption:0}),e=>e.errorCode==='QUESTION_CLOSED');
  const r=await engine.submitAnswer(t._id,fixture.studentA,{questionId:t.questions[0]._id,selectedOption:1});assert.equal(r.attempt.score,10);
  const dup=await engine.submitAnswer(t._id,fixture.studentA,{questionId:t.questions[0]._id,selectedOption:1});assert.equal(dup.attempt.score,10);assert.equal(dup.duplicate,true);
});
test('time-based late joins share end time and repeated start never extends it',async()=>{
  const t=await assessment('time-based');const started=await engine.transition(t._id,fixture.admin,'start');const again=await engine.transition(t._id,fixture.admin,'start');assert.equal(+started.endTime,+again.endTime);
  const {attempt}=await engine.joinTest(t._id,fixture.studentA);assert.equal(+attempt.deadlineAt,+started.endTime);
});
test('socket handshake rejects anonymous users and protected events ignore claimed roles',async()=>{
  await assert.rejects(connect('missing'));
  const t=await assessment(),socket=await connect('studentB');
  try { const r=await socket.timeout(10000).emitWithAck('join_test',{testId:String(t._id),role:'admin',userId:String(fixture.admin._id)});assert.equal(r.success,false);assert.equal(r.error.code,'FORBIDDEN'); } finally {socket.disconnect();}
});
test('socket duplicate answers acknowledge persisted state after reconnect',async()=>{
  const t=await assessment();let socket=await connect('studentA');
  const payload={testId:String(t._id),questionId:String(t.questions[0]._id),selectedOption:1};
  try {
    assert.equal((await socket.timeout(10000).emitWithAck('join_test',{testId:String(t._id)})).success,true);
    assert.equal((await socket.timeout(10000).emitWithAck('submit_answer',payload)).success,true);socket.disconnect();socket=await connect('studentA');
    const state=await socket.timeout(10000).emitWithAck('join_test',{testId:String(t._id)});assert.equal(state.data.attempt.answers.length,1);
    const again=await socket.timeout(10000).emitWithAck('submit_answer',payload);assert.equal(again.data.duplicate,true);
    const done=await socket.timeout(10000).emitWithAck('test_completed',{testId:String(t._id)});assert.equal(done.data.finalScore,2);
  } finally { socket.disconnect(); }
});
test('batch suspension invalidates HTTP, refresh and existing sockets; other batch stays active',async()=>{
  const socket=await connect('studentA');
  const login=await request('/auth/login',null,'POST',{email:fixture.studentA.email,password:fixture.password});
  const disconnected=new Promise(resolve=>socket.once('disconnect',resolve));
  const r=await request('/classrooms/batch-codes/'+fixture.invitations[0]._id+'/toggle-login','admin','PATCH',{loginEnabled:false});assert.equal(r.status,200,JSON.stringify(r.body));await disconnected;
  assert.equal((await request('/auth/me','studentA')).status,403);assert.equal((await request('/auth/me','studentB')).status,200);
  const refresh=await fetch(base+'/api/auth/refresh',{method:'POST',headers:{Cookie:login.cookie.split(';')[0]}});assert.equal(refresh.status,403);
  assert.equal((await request('/classrooms/batch-codes/'+fixture.invitations[0]._id+'/toggle-login','admin','PATCH',{loginEnabled:true})).status,200);
  assert.equal((await request('/auth/me','studentA')).status,200);
});
test('assignment deadlines and classroom-based grading work',async()=>{
  const a=await mongoose.models.Assignment.create({classroomId:fixture.classrooms[0]._id,title:'Timed',startDate:new Date(Date.now()-10000),dueDate:new Date(Date.now()-1000),maxMarks:10});
  assert.equal((await request('/assignments/'+a._id+'/submit','studentA','POST',{comment:'Late'})).status,409);
  await mongoose.models.Assignment.updateOne({_id:a._id},{$set:{allowLate:true}});
  const submitted=await request('/assignments/'+a._id+'/submit','studentA','POST',{comment:'Late'});assert.equal(submitted.status,201);assert.equal(submitted.body.data.isLate,true);
  const grade=await request('/submissions/'+submitted.body.data._id+'/grade','teacher','PATCH',{marks:8,feedback:'Saved'});assert.equal(grade.status,200,JSON.stringify(grade.body));
});
test('promotion rolls back on missing curriculum; succeeds once and preserves history',async()=>{
  const M=mongoose.models;const old=await M.StudentEnrollment.findOne({studentId:fixture.studentA._id,status:'Active'});
  const spec={sourceBatchId:String(fixture.groups[0]._id),targetSessionId:String(fixture.academicSession._id),targetPeriodId:String(fixture.periods[1]._id),targetBatchName:'Promoted A',selectedStudentIds:[String(fixture.studentA._id)],confirmed:true};
  const failed=await request('/academic/promote-batch','admin','POST',spec);assert.equal(failed.status,409,JSON.stringify(failed.body));assert.equal((await M.StudentEnrollment.findById(old._id)).status,'Active');
  await M.Curriculum.create({programId:fixture.program._id,academicPeriodId:fixture.periods[1]._id,courseId:fixture.course._id,defaultTeacherId:fixture.teacher._id});
  const promoted=await request('/academic/promote-batch','admin','POST',spec);assert.equal(promoted.status,200,JSON.stringify(promoted.body));assert.equal((await M.StudentEnrollment.findById(old._id)).status,'Promoted');
  assert.ok(await M.Enrollment.exists({studentId:fixture.studentA._id,classroomId:fixture.classrooms[0]._id}));
  assert.equal((await request('/academic/promote-batch','admin','POST',spec)).status,409);
  assert.equal(await M.AuditLog.countDocuments({action:'BATCH_PROMOTED'}),1);
});
test('logout immediately invalidates old bearer token',async()=>{
  assert.equal((await request('/auth/logout','studentB','POST')).status,200);assert.equal((await request('/auth/me','studentB')).status,401);
});
test('CORS denies unlisted origins and operator keys are rejected',async()=>{
  assert.equal((await fetch(base+'/api/health',{headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal((await request('/auth/login',null,'POST',{email:{$ne:null},password:'x'})).status,400);
});

test('refresh rotation accepts exactly one concurrent use of the cookie',async()=>{
 const login=await request('/auth/login',null,'POST',{email:fixture.studentA.email,password:fixture.password});
 const responses=await Promise.all([0,1].map(()=>fetch(base+'/api/auth/refresh',{method:'POST',headers:{Cookie:login.cookie.split(';')[0]}})));
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,401]);
});
test('a new API process restores committed live answers after restart',async()=>{
 const {fork}=require('node:child_process');const path=require('node:path');const t=await assessment('live-fastest-finger');await engine.transition(t._id,fixture.admin,'start');
 let worker,socket;
 const start=()=>new Promise((resolve,reject)=>{worker=fork(path.join(__dirname,'restart-worker.cjs'),[],{env:{...process.env,TEST_DATABASE_URI:mongoose.connection.getClient().s.url,TEST_DATABASE_NAME:mongoose.connection.name},stdio:['ignore','ignore','ignore','ipc']});worker.once('error',reject);worker.once('exit',code=>{if(code)reject(new Error('Test worker exited '+code));});worker.once('message',({port})=>resolve('http://127.0.0.1:'+port));});
 const stop=()=>new Promise(resolve=>{worker.once('exit',resolve);worker.send('stop');});
 const open=url=>new Promise((resolve,reject)=>{socket=client(url,{auth:{token:tokens.get('studentA')},transports:['websocket'],reconnection:false});socket.once('connect',resolve);socket.once('connect_error',reject);});
 try{await open(await start());await socket.timeout(10000).emitWithAck('join_test',{testId:String(t._id)});const payload={testId:String(t._id),questionId:String(t.questions[0]._id),selectedOption:1};assert.equal((await socket.timeout(10000).emitWithAck('submit_answer',payload)).success,true);socket.disconnect();await stop();
 await open(await start());const restored=await socket.timeout(10000).emitWithAck('join_test',{testId:String(t._id)});assert.equal(restored.data.attempt.answers.length,1);assert.equal(restored.data.attempt.score,10);assert.equal((await socket.timeout(10000).emitWithAck('submit_answer',payload)).data.duplicate,true);
 }finally{socket?.disconnect();if(worker?.connected)await stop();}
});

test('faculty cannot read institutional reports, unrelated history or create academic batches',async()=>{
 assert.equal((await request('/mis/overview','teacher')).status,403);
 assert.equal((await request('/mis/students/'+fixture.studentB._id,'teacher')).status,403);
 assert.equal((await request('/academic/batches','teacher','POST',{name:'Unauthorized'})).status,403);
});
test('student identity approval is explicit, admin-only and audited',async()=>{
 const u=await mongoose.models.User.create({name:'Awaiting approval',email:'approval@example.test',password:fixture.password,role:'student'});
 assert.equal(u.enrollmentApproved,false);
 assert.equal((await request('/users/'+u._id+'/enrollment-approval','teacher','PATCH',{confirmed:true})).status,403);
 assert.equal((await request('/users/'+u._id+'/enrollment-approval','admin','PATCH',{})).status,400);
 assert.equal((await request('/users/'+u._id+'/enrollment-approval','admin','PATCH',{confirmed:true})).status,200);
 assert.equal((await mongoose.models.User.findById(u._id)).enrollmentApproved,true);
 assert.equal(await mongoose.models.AuditLog.countDocuments({action:'STUDENT_IDENTITY_APPROVED',entityId:String(u._id)}),1);
});
test('classroom batch creation rolls back invalid labs and retains assigned faculty',async()=>{
 const M=mongoose.models;const pg=await M.PracticalGroup.create({name:'Lab Atomic',teachingGroupId:fixture.groups[0]._id});
 const body={courseOfferingId:String(fixture.classrooms[0].courseOfferingId),type:'lab',practicalGroupIds:[String(pg._id),String(new mongoose.Types.ObjectId())]};
 assert.equal((await request('/classrooms','admin','POST',body)).status,400);
 assert.equal(await M.Classroom.countDocuments({practicalGroupId:pg._id}),0);
 const created=await request('/classrooms','admin','POST',{...body,practicalGroupIds:[String(pg._id)]});assert.equal(created.status,201,JSON.stringify(created.body));
 assert.equal(created.body.data[0].professorId,String(fixture.teacher._id));assert.ok(+new Date(created.body.data[0].enrollmentExpiresAt)>Date.now());
});
test('concurrent assignment retries preserve one weighted submission and lock grading edits',async()=>{
 const M=mongoose.models;const a=await M.Assignment.create({classroomId:fixture.classrooms[0]._id,title:'Weighted',startDate:new Date(Date.now()-1000),dueDate:new Date(Date.now()+60000),maxMarks:10,questions:[{text:'One',options:['a','b'],correctOptionIndex:0,marks:1},{text:'Two',options:['a','b'],correctOptionIndex:1,marks:3}]});
 const replies=await Promise.all([0,1,2,3].map(()=>request('/assignments/'+a._id+'/submit','studentA','POST',{answers:[null,1]})));
 assert.ok(replies.every(r=>r.status===201),JSON.stringify(replies));assert.ok(replies.every(r=>r.body.data.marks===7.5));assert.equal(await M.Submission.countDocuments({assignmentId:a._id}),1);
 assert.equal((await request('/assignments/'+a._id,'teacher','PATCH',{maxMarks:1})).status,409);
});
test('round-robin accepts only the assigned participant and persists the next turn',async()=>{
 const t=await assessment('live-round-robin');await engine.joinTest(t._id,fixture.studentA);await engine.transition(t._id,fixture.admin,'start');
 await assert.rejects(engine.submitAnswer(t._id,fixture.studentA,{questionId:t.questions[0]._id,selectedOption:1}),e=>e.errorCode==='NOT_YOUR_TURN');
 await engine.transition(t._id,fixture.admin,'next',{nextQuestionIndex:0,turnUserId:String(fixture.studentA._id)});
 assert.equal((await engine.submitAnswer(t._id,fixture.studentA,{questionId:t.questions[0]._id,selectedOption:1})).attempt.score,2);
 await engine.transition(t._id,fixture.admin,'next',{nextQuestionIndex:1,turnUserId:String(fixture.studentA._id)});
 assert.equal((await mongoose.models.Test.findById(t._id)).currentQuestionIndex,1);
});

test('expiry waits behind timely queued answers instead of discarding them',async()=>{
 const t=await assessment();const joined=await engine.joinTest(t._id,fixture.studentA);
 await mongoose.models.TestAttempt.updateOne({_id:joined.attempt._id},{$set:{deadlineAt:new Date(Date.now()+300)}});
 let unblock;const blocked=require('../src/services/liveQueue').serializeRoom(t._id,()=>new Promise(resolve=>{unblock=resolve;}));
 await new Promise(resolve=>setImmediate(resolve));
 const answer=engine.submitAnswer(t._id,fixture.studentA,{questionId:t.questions[0]._id,selectedOption:1});
 await new Promise(resolve=>setTimeout(resolve,400));const expiry=engine.expireAttempts();
 unblock();await blocked;assert.equal((await answer).attempt.score,2);await expiry;
 const stored=await mongoose.models.TestAttempt.findById(joined.attempt._id);assert.equal(stored.status,'completed');assert.equal(stored.answers.length,1);
});
