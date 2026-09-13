const { executeCode } = require('./src/utils/codeExecutor'); 
executeCode('javascript', 'const fs=require("fs"); const i=fs.readFileSync(0,"utf8"); console.log(parseInt(i)*2);', '5')
  .then(console.log)
  .catch(console.error);
