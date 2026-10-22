require('dotenv').config({ quiet: true });
const { validateEnvironment } = require('./config/security');
const mongoose = require('mongoose');
const http = require('node:http');
let startupStage = 'configuration';
async function main() {
  validateEnvironment();
  startupStage = 'database connection';
  await require('./config/db')();
  startupStage = 'application initialization';
  const server = http.createServer(require('./app'));
  const io = require('./sockets/testSocket').initSocket(server);
  startupStage = 'HTTP listener';
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(process.env.PORT || 5000, () => { server.removeListener('error', reject); resolve(); });
  });
  console.log('SkillBery API ready');
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return; stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000).unref();
    io.close(); server.close();
    await mongoose.disconnect(); clearTimeout(timeout);
  };
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
  process.on('unhandledRejection', () => { console.error('Unhandled rejection; shutting down'); shutdown(); });
}
main().catch(async error => {
  console.error(require('./config/startupError')(startupStage, error));
  await mongoose.disconnect();
  process.exitCode = 1;
});
