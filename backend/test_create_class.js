const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Classroom = require('./src/models/Classroom');
const CourseOffering = require('./src/models/CourseOffering');

dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms';

async function run() {
  try {
    await mongoose.connect(uri);
    
    // Find a random offering
    const offering = await CourseOffering.findOne().populate('courseId academicSessionId');
    if (!offering) {
      console.log('No offerings found to test with.');
      process.exit(0);
    }
    
    console.log('Testing Classroom.create with offering:', offering._id);
    
    try {
      const classroom = await Classroom.create({
        courseOfferingId: offering._id,
        courseId: offering.courseId._id,
        professorId: offering.primaryTeacherId,
        session: offering.academicSessionId ? offering.academicSessionId.name : 'Default Session',
        type: 'theory',
        practicalGroupId: null,
      });
      console.log('Success!', classroom._id);
    } catch (e) {
      console.log('FAILED VALIDATION:');
      console.dir(e, { depth: null });
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
