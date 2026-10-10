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
    const offerings = await CourseOffering.find().populate('courseId academicSessionId').lean();
    for (const offering of offerings) {
      console.log('Offering:', offering._id);
      console.log('courseId:', offering.courseId ? offering.courseId._id || 'NO _ID' : 'NULL');
      console.log('academicSessionId name:', offering.academicSessionId ? offering.academicSessionId.name : 'NULL');
      
      const classroom = new Classroom({
        courseOfferingId: offering._id,
        courseId: offering.courseId ? offering.courseId._id : null,
        professorId: new mongoose.Types.ObjectId(),
        session: offering.academicSessionId ? offering.academicSessionId.name : 'Default',
        type: 'theory',
        practicalGroupId: null,
      });
      const err = classroom.validateSync();
      if (err) {
        console.log('VALIDATION ERROR:', Object.keys(err.errors).map(k => ({ [k]: err.errors[k].message })));
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
