const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const crypto = require('crypto');

/**
 * Executes a snippet of code locally.
 * 
 * @param {string} language - 'javascript' or 'python'
 * @param {string} code - The source code to run
 * @param {string} input - The standard input to provide to the script
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<{stdout: string, stderr: string, success: boolean}>}
 */
const executeCode = async (language, code, input = '', timeoutMs = 5000) => {
  const tmpDir = os.tmpdir();
  const fileId = crypto.randomBytes(16).toString('hex');
  
  let ext = '';
  let command = '';
  
  if (language === 'javascript' || language === 'nodejs' || language === 'js') {
    ext = '.js';
    command = 'node';
    
    // Auto-detect function name and append runner wrapper
    const match = code.match(/function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(/) || code.match(/(?:const|let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*(?:function|\([^)]*\)\s*=>)/);
    if (match) {
      const funcName = match[1];
      code += `\n
const __fs = require('fs');
const __inputStr = __fs.readFileSync(0, 'utf8').trim();
if (__inputStr) {
  let __parsed;
  try { __parsed = JSON.parse(__inputStr); } catch(e) { __parsed = __inputStr; }
  
  let __result;
  if (Array.isArray(__parsed) && ${funcName}.length > 1) {
    __result = ${funcName}(...__parsed);
  } else {
    __result = ${funcName}(__parsed);
  }
  
  if (typeof __result === 'object') console.log(JSON.stringify(__result));
  else if (__result !== undefined) console.log(__result);
}
`;
    }
  } else if (language === 'python' || language === 'py') {
    ext = '.py';
    command = 'python';
    
    // Python auto-wrapper
    const match = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    if (match) {
      const funcName = match[1];
      code += `\n
import sys, json, inspect
__input_str = sys.stdin.read().strip()
if __input_str:
    try:
        __parsed = json.loads(__input_str)
    except:
        __parsed = __input_str

    __sig = inspect.signature(${funcName})
    if isinstance(__parsed, list) and len(__sig.parameters) > 1:
        __result = ${funcName}(*__parsed)
    else:
        __result = ${funcName}(__parsed)
        
    if __result is not None:
        if isinstance(__result, (dict, list)):
            print(json.dumps(__result).replace(" ", ""))
        else:
            print(__result)
`;
    }
  } else {
    throw new Error(`Unsupported language: ${language}`);
  }

  const codeFilePath = path.join(tmpDir, `code_${fileId}${ext}`);
  
  try {
    await fs.writeFile(codeFilePath, code);
    
    return await new Promise((resolve) => {
      const child = spawn(command, [codeFilePath]);

      let stdout = '';
      let stderr = '';

      // Timeout logic
      const timer = setTimeout(() => {
        child.kill();
        resolve({
          stdout,
          stderr: 'Error: Execution timed out (exceeded time limit).',
          success: false
        });
      }, timeoutMs);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: error.message || 'Execution error',
          success: false
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          success: code === 0
        });
      });

      // Pass input via stdin
      if (input) {
        child.stdin.write(input);
      }
      child.stdin.end();
    });
  } catch (err) {
    return {
      stdout: '',
      stderr: `Failed to initialize execution: ${err.message}`,
      success: false
    };
  } finally {
    // Clean up temporary files
    try {
      await fs.unlink(codeFilePath).catch(() => {});
    } catch (e) {
      // ignore cleanup errors
    }
  }
};

module.exports = { executeCode };
