function maximumScore(test) {
 if (!test?.questions?.length) return 0;
 return test.questions.reduce((sum,q)=>sum+(test.testType==='live-fastest-finger'?Math.max(q.points??1,test.fastestBonusPoints??10):(q.points??1)),0);
}
module.exports={maximumScore};
