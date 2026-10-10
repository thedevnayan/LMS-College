const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('./src/models/Institution');
require('./src/models/AcademicSession');
require('./src/models/Course');
require('./src/models/User');
const Classroom = require('./src/models/Classroom');
const CourseOffering = require('./src/models/CourseOffering');

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms-college';

async function run() {
  try {
    await mongoose.connect(uri);
    
    const offering = await CourseOffering.findOne({ courseId: new mongoose.Types.ObjectId('6ac8969dd503ce569559f802') });
    if (offering) {
      await Classroom.deleteMany({ courseOfferingId: offering._id, type: 'theory' });
      console.log('Cleaned up test classroom');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
