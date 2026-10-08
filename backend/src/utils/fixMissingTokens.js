require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Classroom = require('../models/Classroom');
const BatchJoinCode = require('../models/BatchJoinCode');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-college';

async function fixMissingTokens() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Fix Classrooms
    const classrooms = await Classroom.find({ enrollmentToken: { $exists: false } });
    console.log(`Found ${classrooms.length} classrooms missing enrollmentToken.`);
    let classCount = 0;
    for (const cls of classrooms) {
      cls.enrollmentToken = uuidv4();
      await cls.save();
      classCount++;
    }
    const nullClassrooms = await Classroom.find({ enrollmentToken: null });
    console.log(`Found ${nullClassrooms.length} classrooms with null enrollmentToken.`);
    for (const cls of nullClassrooms) {
      cls.enrollmentToken = uuidv4();
      await cls.save();
      classCount++;
    }
    console.log(`Updated ${classCount} classrooms.`);

    // Fix BatchJoinCodes
    const batchCodes = await BatchJoinCode.find({ enrollmentToken: { $exists: false } });
    console.log(`Found ${batchCodes.length} batch codes missing enrollmentToken.`);
    let batchCount = 0;
    for (const code of batchCodes) {
      code.enrollmentToken = uuidv4();
      await code.save();
      batchCount++;
    }
    const nullBatchCodes = await BatchJoinCode.find({ enrollmentToken: null });
    console.log(`Found ${nullBatchCodes.length} batch codes with null enrollmentToken.`);
    for (const code of nullBatchCodes) {
      code.enrollmentToken = uuidv4();
      await code.save();
      batchCount++;
    }
    console.log(`Updated ${batchCount} batch codes.`);

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixMissingTokens();
