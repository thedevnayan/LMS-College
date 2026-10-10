const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Classroom = require('./src/models/Classroom');
const CourseOffering = require('./src/models/CourseOffering');
require('./src/models/Course');
require('./src/models/AcademicSession');
require('./src/models/User');

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms-college';

async function run() {
  try {
    await mongoose.connect(uri);
    
    const offering = await CourseOffering.findOne().populate('courseId academicSessionId');
    if (!offering) {
      console.log('No offerings found in lms-college.');
      process.exit(0);
    }
    
    try {
      const classroom = await Classroom.create({
        courseOfferingId: offering._id,
        courseId: offering.courseId._id,
        professorId: offering.primaryTeacherId,
        session: offering.academicSessionId ? offering.academicSessionId.name : 'Default Session',
        type: 'theory',
        practicalGroupId: null,
      });
      console.log('Classroom created successfully!', classroom._id);
    } catch (e) {
      console.log('FAILED VALIDATION OR SAVE:');
      console.dir(e, { depth: null });
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
