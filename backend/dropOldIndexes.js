const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env
dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms';

async function run() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to DB');

    // Register models
    require('./src/models/CourseOffering');
    require('./src/models/Classroom');
    require('./src/models/FacultyAllocation');
    
    // Sync CourseOffering
    console.log('Syncing CourseOffering indexes...');
    await mongoose.model('CourseOffering').syncIndexes();
    console.log('CourseOffering synced!');

    // Sync Classroom
    console.log('Syncing Classroom indexes...');
    await mongoose.model('Classroom').syncIndexes();
    console.log('Classroom synced!');

    // Sync FacultyAllocation
    console.log('Syncing FacultyAllocation indexes...');
    await mongoose.model('FacultyAllocation').syncIndexes();
    console.log('FacultyAllocation synced!');

    console.log('All indexes synchronized. Old indexes dropped.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
