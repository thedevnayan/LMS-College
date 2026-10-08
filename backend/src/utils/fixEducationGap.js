const mongoose = require('mongoose');
require('../models');
const User = require('../models/User');
const StudentEnrollment = require('../models/StudentEnrollment');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/lms-college');
  console.log('Connected to MongoDB');

  const resUsers = await User.updateMany(
    { role: 'student' },
    {
      $set: {
        educationGap: 'None (Continuous Enrollment)',
        admissionYear: 2026,
        qualification: 'Higher Secondary / 10+2',
      },
    }
  );
  console.log('Updated students:', resUsers.modifiedCount);

  const resEnrs = await StudentEnrollment.updateMany(
    {},
    {
      $set: {
        educationGap: 'None (Continuous Enrollment)',
      },
    }
  );
  console.log('Updated enrollments:', resEnrs.modifiedCount);

  const allStudents = await User.find({ role: 'student' });
  console.log('All students check:');
  allStudents.forEach((s) =>
    console.log(`  - ${s.name} (${s.email}) | gap: ${s.educationGap} | year: ${s.admissionYear} | qual: ${s.qualification}`)
  );

  await mongoose.disconnect();
  console.log('Done!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
