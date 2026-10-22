const {test}=require('node:test');const assert=require('node:assert/strict');const mongoose=require('mongoose');const {execFile}=require('node:child_process');const {promisify}=require('node:util');const path=require('node:path');const {database,seed}=require('./fixtures.cjs');
test('migration is read-only by default and explicit apply preserves records',async()=>{
 const cleanup=await database();try{
 const f=await seed(),db=mongoose.connection.db;
 await db.collection('classrooms').updateOne({_id:f.classrooms[0]._id},{$unset:{teachingGroupId:'',classBatch:''}});
 await db.collection('academicperiods').createIndex({deletedAt:1},{name:'legacy_deleted_ttl',expireAfterSeconds:604800});
 const before=await db.collection('classrooms').findOne({_id:f.classrooms[0]._id});
 const uri=mongoose.connection.getClient().s.url;
 // The child uses the same test-only database name, not the driver's default.
 const parsed=new URL(uri);parsed.pathname='/'+mongoose.connection.name;
 const run=async args=>JSON.parse((await promisify(execFile)(process.execPath,[path.join(__dirname,'../scripts/migrate-skillbery.cjs'),...args],{env:{...process.env,MIGRATION_URI:parsed.toString()},windowsHide:true,maxBuffer:2*1024*1024})).stdout);
 const plan=await run([]);assert.equal(plan.mode,'dry-run');assert.equal(plan.classroomBackfills,1);
 assert.deepEqual(await db.collection('classrooms').findOne({_id:f.classrooms[0]._id}),before);
 assert.ok((await db.collection('academicperiods').indexes()).some(i=>i.name==='legacy_deleted_ttl'));
 const result=await run(['--apply-schema','--backup-confirmed','--retire-legacy-indexes']);assert.equal(result.mode,'apply');
 assert.equal(await db.collection('classrooms').countDocuments(),2);assert.equal(await db.collection('users').countDocuments(),4);
 assert.equal(String((await db.collection('classrooms').findOne({_id:f.classrooms[0]._id})).teachingGroupId),String(f.groups[0]._id));
 assert.ok(!(await db.collection('academicperiods').indexes()).some(i=>i.name==='legacy_deleted_ttl'));
 assert.equal((await run([])).classroomBackfills,0);
 }finally{await cleanup();}
});
