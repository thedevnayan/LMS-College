const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('./src/models/Institution');
require('./src/models/AcademicSession');
require('./src/models/Course');
require('./src/models/User');
const Classroom = require('./src/models/Classroom');
const CourseOffering = require('./src/models/CourseOffering');
const Course = require('./src/models/Course');
const User = require('./src/models/User');

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms-college';

async function run() {
  try {
    await mongoose.connect(uri);
    
    const admin = await User.findOne({ email: 'admin@admin.com' });
    if (!admin) { console.log('Admin not found'); return process.exit(0); }

    const course = await Course.findOne({ title: /Programming with C/i });
    if (!course) { console.log('Course not found'); return process.exit(0); }

    const offering = await CourseOffering.findOne({ courseId: course._id }).populate('academicSessionId');
    if (!offering) { console.log('Offering not found'); return process.exit(0); }

    try {
      const classroom = await Classroom.create({
        courseOfferingId: offering._id,
        courseId: offering.courseId,
        professorId: admin._id,
        session: offering.academicSessionId ? offering.academicSessionId.name : 'Default Session',
        type: 'theory',
        practicalGroupId: null,
      });
      console.log('Classroom created successfully!', classroom._id);
      
      // Clean it up
      await Classroom.findByIdAndDelete(classroom._id);
    } catch (e) {
      console.log('FAILED VALIDATION OR SAVE:');
      if (e.errors) {
        console.log('FIELDS:', Object.keys(e.errors).map(k => ({ [k]: e.errors[k].message })));
      } else {
        console.dir(e, { depth: null });
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
