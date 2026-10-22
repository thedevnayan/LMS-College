const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { detectFile } = require('../src/services/fileStorage');
const { gradeAnswers } = require('../src/services/assignmentRules');
const { studentTest } = require('../src/services/assessment');
test('assignment grading respects unequal weights and zero max marks',()=>{
 const assignment={maxMarks:10,questions:[{marks:1,options:['a','b'],correctOptionIndex:0},{marks:3,options:['a','b'],correctOptionIndex:1}]};
 assert.equal(gradeAnswers(assignment,[0,null]),2.5);assert.equal(gradeAnswers(assignment,[null,1]),7.5);assert.equal(gradeAnswers({...assignment,maxMarks:0},[0,1]),0);
});
test('waiting time-based and future standard payloads conceal questions',()=>{
 for(const t of [{testType:'time-based',liveStatus:'waiting'},{testType:'standard',availableFrom:new Date(Date.now()+60000)}])assert.notEqual(studentTest({...t,questions:[{text:'Private question',options:['a','b'],correctOptionIndex:1}]}).questions[0].text,'Private question');
});
test('file magic rejects renamed executables and malformed Office archives',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'skillbery-content-'));
 try {for(const [name,data,expected]of [['document.pdf',Buffer.from('MZ executable'),null],['bad.docx',Buffer.from([80,75,3,4]),null],['good.pdf',Buffer.from('%PDF-1.7\nsynthetic'), 'pdf'],['script.png',Buffer.from('<script>alert(1)</script>'),null]]){
 const file=path.join(dir,name);await fs.writeFile(file,data);if(expected)assert.equal((await detectFile(file)).format,expected);else await assert.rejects(detectFile(file),e=>e.errorCode==='INVALID_FILE');
 }}finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('report denominators preserve zero points and account for fastest-finger bonuses',()=>{
 const {maximumScore}=require('../src/services/assessmentStats');
 assert.equal(maximumScore({testType:'standard',questions:[{points:0},{points:3}]}),3);
 assert.equal(maximumScore({testType:'live-fastest-finger',fastestBonusPoints:10,questions:[{points:2},{points:3}]}),20);
});
