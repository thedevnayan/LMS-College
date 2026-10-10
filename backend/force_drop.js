const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms-college';

async function run() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const db = mongoose.connection.db;
    
    try {
      await db.collection('classrooms').dropIndex('courseId_1_session_1_classBatch_1_type_1_labBatch_1');
      console.log('Dropped classroom legacy index!');
    } catch(e) { console.log('Could not drop classroom index', e.message); }

    try {
      await db.collection('courseofferings').dropIndex('courseId_1_academicSessionId_1_programId_1_academicPeriodId_1');
      console.log('Dropped courseoffering legacy index!');
    } catch(e) { console.log('Could not drop courseoffering index', e.message); }

    try {
      await db.collection('classrooms').dropIndex('courseId_1_session_1_type_1');
    } catch(e) {}
    
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
