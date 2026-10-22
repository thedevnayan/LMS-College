const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const mongoose=require('mongoose');
const {database,seed}=require('./fixtures.cjs');
test('multiple images create one protected classroom resource',async()=>{
 process.env.JWT_ACCESS_SECRET='test-access-secret-12345678901234567890';process.env.JWT_REFRESH_SECRET='test-refresh-secret-12345678901234567890';process.env.NODE_ENV='test';
 const cleanup=await database();let server;
 const storage=require('../src/services/fileStorage');const original=storage.cloudinary.uploader.upload;
 const oldEnv=Object.fromEntries(['CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','CLOUDINARY_CLOUD_NAME'].map(k=>[k,process.env[k]]));
 try{
 for(const key of Object.keys(oldEnv))process.env[key]='synthetic';
 storage.cloudinary.uploader.upload=async()=>({});
 const f=await seed();server=http.createServer(require('../src/app'));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port+'/api';const token=user=>require('../src/services/tokens').generateTokens(user).accessToken;
 const form=new FormData();form.set('title','One gallery');form.set('topic','Lesson');form.set('type','image');
 for(const name of ['one.png','two.png'])form.append('file',new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0,0,0,0,0])],{type:'image/png'}),name);
 const response=await fetch(base+'/classrooms/'+f.classrooms[0]._id+'/materials',{method:'POST',headers:{Authorization:'Bearer '+token(f.teacher)},body:form});const body=await response.json();assert.equal(response.status,201,JSON.stringify(body));
 assert.equal(await mongoose.models.Material.countDocuments({title:'One gallery'}),1);assert.equal(body.data.images.length,2);assert.equal(body.data.images[0].publicId,undefined);
 const doc=await mongoose.models.Material.findById(body.data._id);assert.equal(doc.images.length,2);assert.ok(doc.images[0].publicId);
 const denied=await fetch(base+'/materials/'+doc._id+'/images/0',{headers:{Authorization:'Bearer '+token(f.studentB)}});assert.equal(denied.status,403);
 const missing=await fetch(base+'/materials/'+doc._id+'/images/99',{headers:{Authorization:'Bearer '+token(f.studentA)}});assert.equal(missing.status,404);
 }finally{storage.cloudinary.uploader.upload=original;for(const [key,value]of Object.entries(oldEnv)){if(value===undefined)delete process.env[key];else process.env[key]=value;}if(server)await new Promise(r=>server.close(r));await cleanup();}
});
