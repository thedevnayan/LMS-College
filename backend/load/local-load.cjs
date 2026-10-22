// Synthetic local-only workload. Does not load .env, take a remote URL, or use existing data.
const { performance, monitorEventLoopDelay } = require('node:perf_hooks');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const mongoose = require('mongoose');
const { io: connect } = require('socket.io-client');
const { database, seed } = require('../tests/fixtures.cjs');
const { generateTokens } = require('../src/services/tokens');
const count = Number(process.argv[2] || 200);
if (![20,200,400].includes(count)) throw new Error('Choose 20 (smoke), 200 or 400 synthetic students');
const samples = {}, failures = [];
const record = (name, ms) => (samples[name] ||= []).push(ms);
const measure = async (name, fn) => { const start=performance.now(); try { return await fn(); } catch(e) {failures.push({stage:name,message:e.message,cause:e.cause?.message,code:e.cause?.code});throw e;} finally {record(name,performance.now()-start);} };
const summarize = list => { const sorted=[...list].sort((a,b)=>a-b); const q=p=>Number(sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)].toFixed(2));return {count:list.length,p50Ms:q(.5),p95Ms:q(.95),p99Ms:q(.99),maxMs:q(1)}; };
let cleanup,server,io,sockets=[];
const agent = new http.Agent({ keepAlive: true, maxSockets: 100 });
function getJSON(url, token) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { agent, headers: { Authorization: 'Bearer '+token } }, res => {
      let body=''; res.setEncoding('utf8'); res.on('data', chunk => body+=chunk);
      res.on('error', reject); res.on('end', () => {
        if(res.statusCode!==200) return reject(new Error('HTTP '+res.statusCode));
        try { const data=JSON.parse(body); if(!data.success) throw new Error('API failure'); resolve(data); } catch(e) { reject(e); }
      });
    });
    req.setTimeout(30000,()=>req.destroy(new Error('HTTP timeout'))); req.on('error',reject);
  });
}
async function main() {
  process.env.NODE_ENV='test';process.env.JWT_ACCESS_SECRET='load-only-access-123456789012345678901234';process.env.JWT_REFRESH_SECRET='load-only-refresh-123456789012345678901234';
  cleanup=await database();const f=await seed(),M=mongoose.models;
  const hash=await require('bcrypt').hash('Synthetic123!',10);
  const users=await M.User.insertMany(Array.from({length:count},(_,i)=>({name:'Synthetic '+i,email:'load'+i+'@example.test',password:hash,role:'student'})));
  await M.Enrollment.insertMany(users.map((u,i)=>({studentId:u._id,courseId:f.course._id,classroomId:f.classrooms[i%2]._id})));
  await M.StudentEnrollment.insertMany(users.map((u,i)=>({studentId:u._id,institutionId:f.institution._id,programId:f.program._id,cohortId:f.cohort._id,academicSessionId:f.academicSession._id,academicPeriodId:f.periods[0]._id,teachingGroupId:f.groups[i%2]._id})));
  for(const c of f.classrooms) await M.Material.create({classroomId:c._id,title:'Synthetic notes',topic:'Load',type:'text',content:'Example study material',order:1});
  const tests=await M.Test.create(f.classrooms.map(c=>({classroomId:c._id,title:'Load room',testType:'live-fastest-finger',status:'published',timeLimit:10,questionTimeLimitSeconds:120,questions:[{questionType:'mcq',text:'Select B',options:['A','B'],correctOptionIndex:1,points:2},{questionType:'mcq',text:'Select A',options:['A','B'],correctOptionIndex:0,points:2}]})));
  server=http.createServer(require('../src/app'));io=require('../src/sockets/testSocket').initSocket(server);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const tokens=users.map(generateTokens).map(t=>t.accessToken);
  const cpuStart=process.cpuUsage(),wallStart=performance.now();let peakRss=process.memoryUsage().rss;
  const eventLoop=monitorEventLoopDelay({resolution:20});eventLoop.enable();
  const memoryTimer=setInterval(()=>{peakRss=Math.max(peakRss,process.memoryUsage().rss);},100).unref();
  const dbBefore=await mongoose.connection.db.admin().serverStatus();
  // Three complete page journeys, each user issues requests concurrently with peers.
  const browsingStart=performance.now();
  for(let round=0;round<3;round++) await Promise.all(users.map((user,i)=>measure('browseJourney',async()=>{
    for(const route of ['/classrooms','/dashboard/student','/classrooms/'+f.classrooms[i%2]._id+'/materials']) {
      await measure('http',()=>getJSON(base+'/api'+route,tokens[i]));
    }
  })));
  const browsingSeconds=(performance.now()-browsingStart)/1000;
  const open = index => measure('socketConnect',()=>new Promise((resolve,reject)=>{
    const socket=connect(base,{auth:{token:tokens[index]},transports:['websocket'],reconnection:false,timeout:30000});
    socket.once('connect',()=>resolve(socket));socket.once('connect_error',reject);
  }));
  const ack = (socket,event,payload,metric=event) => measure(metric,async()=>{
    const response=await socket.timeout(120000).emitWithAck(event,payload);if(!response.success)throw new Error(response.error.message);return response.data;
  });
  for(let start=0;start<count;start+=50) sockets.push(...await Promise.all(users.slice(start,start+50).map((_,i)=>open(start+i))));
  await Promise.all(sockets.map((socket,i)=>ack(socket,'join_test',{testId:String(tests[i%2]._id)})));
  const admin=connect(base,{auth:{token:generateTokens(f.admin).accessToken},transports:['websocket'],reconnection:false});
  await new Promise((resolve,reject)=>{admin.once('connect',resolve);admin.once('connect_error',reject);});sockets.push(admin);
  let releases=0,leaderboardEvents=0;
  const releaseAt=new Map();
  users.forEach((_,i)=>sockets[i].on('test_started',()=>{releases++;record('releaseDelivery',performance.now()-releaseAt.get(i%2));}));
  // Staff dashboards are room-scoped; track all answer updates with one observer per room.
  await ack(admin,'join_test',{testId:String(tests[0]._id)},'adminJoin');admin.on('student_answered',()=>leaderboardEvents++);
  const admin2=connect(base,{auth:{token:generateTokens(f.admin).accessToken},transports:['websocket'],reconnection:false});await new Promise(resolve=>admin2.once('connect',resolve));sockets.push(admin2);
  await ack(admin2,'join_test',{testId:String(tests[1]._id)},'adminJoin');admin2.on('student_answered',()=>leaderboardEvents++);
  for(let room=0;room<2;room++){releaseAt.set(room,performance.now());await ack(room?admin2:admin,'start_test',{testId:String(tests[room]._id)},'start');}
  const burstStart=performance.now();
  await Promise.all(users.map((_,i)=>ack(sockets[i],'submit_answer',{testId:String(tests[i%2]._id),questionId:String(tests[i%2].questions[0]._id),selectedOption:1})));
  const burstSeconds=(performance.now()-burstStart)/1000;
  // Disconnect 10%, reconnect, restore attempt, retry the accepted answer.
  const reconnectCount=Math.max(1,Math.floor(count*.1));
  for(let i=0;i<reconnectCount;i++) sockets[i].disconnect();
  for(let i=0;i<reconnectCount;i++) {
    sockets[i]=await open(i);const state=await ack(sockets[i],'join_test',{testId:String(tests[i%2]._id)},'rejoin');if(state.attempt.answers.length!==1)throw new Error('Reconnect lost an answer');
    const result=await ack(sockets[i],'submit_answer',{testId:String(tests[i%2]._id),questionId:String(tests[i%2].questions[0]._id),selectedOption:1},'duplicateRetry');if(!result.duplicate)throw new Error('Retry was not idempotent');
  }
  await Promise.all(users.map((_,i)=>ack(sockets[i],'test_completed',{testId:String(tests[i%2]._id)})));
  const attempts=await M.TestAttempt.find({testId:{$in:tests.map(t=>t._id)}}).lean();
  const correct=attempts.length===count&&attempts.every(a=>a.answers.length===1&&a.status==='completed')&&attempts.filter(a=>a.score===10).length===2&&attempts.reduce((sum,a)=>sum+a.score,0)===(count-2)*2+20;
  if(!correct)throw new Error('Persistence/score consistency failed');
  const dbAfter=await mongoose.connection.db.admin().serverStatus();
  clearInterval(memoryTimer);eventLoop.disable();
  const cpu=process.cpuUsage(cpuStart);
  const report={runAt:new Date().toISOString(),environment:'Single local Node process for API and clients; disposable single-node MongoDB replica set. Not a production benchmark.',students:count,httpMaxConnections:100,socketConnectionRampBatch:50,rooms:2,httpRequests:count*9,httpThroughputPerSecond:Number((count*9/browsingSeconds).toFixed(2)),answerThroughputPerSecond:Number((count/burstSeconds).toFixed(2)),durationSeconds:Number(((performance.now()-wallStart)/1000).toFixed(2)),metrics:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,summarize(v)])),errors:failures.length,failures,releaseDelivery:{expected:count,observed:releases},leaderboardEvents,consistency:{attempts:attempts.length,passed:correct},reconnections:reconnectCount,process:{peakRssMB:Number((peakRss/1024/1024).toFixed(2)),cpuUserMs:cpu.user/1000,cpuSystemMs:cpu.system/1000,eventLoopP95Ms:Number((eventLoop.percentile(95)/1e6).toFixed(2))},database:{connections:dbAfter.connections.current,queryDelta:dbAfter.opcounters.query-dbBefore.opcounters.query,updateDelta:dbAfter.opcounters.update-dbBefore.opcounters.update},restartRecovery:'Not exercised by this harness; reconnect and persisted-state checks only'};
  const output=path.resolve(__dirname,'../../docs/load-'+count+'.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);console.error(JSON.stringify(failures));process.exitCode=1;}).finally(async()=>{agent.destroy();for(const socket of sockets)socket.disconnect();if(io)await new Promise(resolve=>io.close(resolve));if(cleanup)await cleanup();});
