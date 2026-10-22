const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scoreMCQ, deadline, studentTest, assertAvailable } = require('../src/services/assessment');
const { assertSubmissionWindow, validateAnswers } = require('../src/services/assignmentRules');
const { validateProgression } = require('../src/services/promotion');
test('MCQ score comes from server key, with zero marks preserved', () => {
  const q = { questionType:'mcq', options:['a','b'], correctOptionIndex:1, points:0 };
  assert.deepEqual(scoreMCQ(q,1), {isCorrect:true,pointsAwarded:0});
  assert.throws(() => scoreMCQ(q,'1'), /valid option/);
  assert.throws(() => scoreMCQ(q,2), /valid option/);
});
test('nonempty coding source cannot earn a score', () => assert.throws(() => scoreMCQ({questionType:'coding'},0), /isolated judge/));
test('standard deadline is capped by the availability window', () => {
  assert.equal(+deadline({testType:'standard',timeLimit:60,availableUntil:new Date(120000)},new Date(0)),120000);
});
test('time-based test uses shared server end rather than arrival time', () => {
  assert.equal(+deadline({testType:'time-based',timeLimit:60,endTime:new Date(60000)},new Date(55000)),60000);
});
test('availability rejects draft, future and closed tests', () => {
  assert.throws(() => assertAvailable({status:'draft'}));
  assert.throws(() => assertAvailable({status:'published',availableFrom:new Date(1000)},0));
  assert.throws(() => assertAvailable({status:'published',availableUntil:new Date(1000)},1000));
});
test('student payload strips keys, hidden cases, tokens and unreleased questions', () => {
  const value=studentTest({testType:'live-fastest-finger',liveStatus:'in-progress',currentQuestionIndex:0,sessionToken:'secret',questions:[{correctOptionIndex:1,testCases:[{isHidden:true},{isHidden:false}]},{text:'future',correctOptionIndex:0}]});
  assert.equal(value.sessionToken,undefined);assert.equal(value.questions[0].correctOptionIndex,undefined);assert.equal(value.questions[0].testCases.length,1);assert.notEqual(value.questions[1].text,'future');
});
test('assignment opening, deadline and explicit late policy are enforced', () => {
  const a={startDate:new Date(100),dueDate:new Date(200)};
  assert.throws(()=>assertSubmissionWindow(a,99));assert.throws(()=>assertSubmissionWindow(a,201));assert.doesNotThrow(()=>assertSubmissionWindow({...a,allowLate:true},201));
});
test('assignment options must match question count and valid indexes', () => {
  const a={questions:[{options:['a','b']}]};assert.throws(()=>validateAnswers(a,[0,1]));assert.throws(()=>validateAnswers(a,[5]));assert.doesNotThrow(()=>validateAnswers(a,[null]));
});
test('promotion cannot skip semesters or cross programs', () => {
  const source={programId:'p'},from={periodNumber:4},target={programId:'p',periodNumber:5};
  assert.doesNotThrow(()=>validateProgression(source,from,target,{status:'Active'}));
  assert.throws(()=>validateProgression(source,from,{...target,periodNumber:6},{status:'Active'}));
  assert.throws(()=>validateProgression(source,from,{...target,programId:'q'},{status:'Active'}));
});
test('code executor fails closed without starting a process', async () => {
  await assert.rejects(require('../src/utils/codeExecutor').executeCode('javascript','process.exit()'), e=>e.errorCode==='JUDGE_UNAVAILABLE');
});
