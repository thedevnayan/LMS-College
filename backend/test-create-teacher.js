const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testCreateTeacher() {
  try {
    // 1. Connect to MongoDB to get an admin user
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = require('./src/models/User');
    
    // Find an admin user
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin found, creating a temporary admin user...');
      admin = await User.create({
        name: 'Test Admin',
        email: 'testadmin@example.com',
        password: 'Password123!',
        role: 'admin',
      });
    }

    // 2. Generate a valid token for the admin
    const token = jwt.sign({ id: admin._id }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: '1h',
    });
    
    console.log(`Admin token generated for: ${admin.email}`);

    // 3. Make the API request to create a teacher
    const testTeacherEmail = `teacher_${Date.now()}@example.com`;
    const payload = {
      name: 'New Script Teacher',
      email: testTeacherEmail,
      password: 'Password123!',
      role: 'teacher'
    };

    console.log('\n--- TESTING POST /api/users ---');
    console.log('Request Payload:', payload);
    
    // Import node-fetch dynamically since it's a commonjs project (Node 18+ has native fetch)
    const res = await fetch('http://localhost:5001/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('\nResponse Status:', res.status);
    console.log('Response Body:', JSON.stringify(data, null, 2));

    if (res.status === 201) {
      console.log('\n[SUCCESS]: API successfully created the teacher!');
      
      // Clean up test data
      await User.deleteOne({ email: testTeacherEmail });
      console.log(`[CLEANUP] Cleaned up test user: ${testTeacherEmail}`);
    } else {
      console.log('\n[FAILED]: API failed to create the teacher.');
    }

  } catch (error) {
    console.error('Test Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testCreateTeacher();
