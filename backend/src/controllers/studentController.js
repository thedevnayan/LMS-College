const User = require('../models/User');
const Classroom = require('../models/Classroom');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');
const TestAttempt = require('../models/TestAttempt');
const Assignment = require('../models/Assignment');
const Test = require('../models/Test');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @route   GET /api/students
 * @access  Professor only
 * @desc    Get all students enrolled in any of the professor's classrooms, with their aggregated stats
 */
const getTeacherStudents = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'professor') {
    return next(new ApiError(403, 'FORBIDDEN', 'Only professors can view students'));
  }

  // Find all classrooms owned by the professor
  const classrooms = await Classroom.find({ professorId: req.user._id });
  const classroomIds = classrooms.map(c => c._id);

  // Find all enrollments in these classrooms
  const enrollments = await Enrollment.find({ classroomId: { $in: classroomIds }, deletedAt: null }).populate('studentId', 'name email avatarUrl');

  // Group by student
  const studentMap = {};
  
  enrollments.forEach(e => {
    if (!e.studentId) return;
    const sId = e.studentId._id.toString();
    if (!studentMap[sId]) {
      studentMap[sId] = {
        _id: e.studentId._id,
        name: e.studentId.name,
        email: e.studentId.email,
        avatarUrl: e.studentId.avatarUrl,
        classroomsEnrolled: 0,
      };
    }
    studentMap[sId].classroomsEnrolled += 1;
  });

  const students = Object.values(studentMap);

  // For each student, let's fetch their average marks and tests attended
  const assignments = await Assignment.find({ classroomId: { $in: classroomIds } });
  const tests = await Test.find({ classroomId: { $in: classroomIds } });
  const assignmentIds = assignments.map(a => a._id);
  const testIds = tests.map(t => t._id);

  const maxMarksMap = {};
  assignments.forEach(a => maxMarksMap[a._id.toString()] = a.maxMarks || 100);
  tests.forEach(t => maxMarksMap[t._id.toString()] = t.maxMarks || 100);

  const allSubmissions = await Submission.find({ assignmentId: { $in: assignmentIds }, status: 'graded' });
  const allTestAttempts = await TestAttempt.find({ testId: { $in: testIds }, status: 'completed' });

  // Calculate stats for each student
  students.forEach(student => {
    let totalMarksObtained = 0;
    let totalMaxMarks = 0;
    let testsAttended = 0;

    const mySubmissions = allSubmissions.filter(s => s.studentId.toString() === student._id.toString());
    const myTestAttempts = allTestAttempts.filter(ta => ta.studentId.toString() === student._id.toString());

    testsAttended = myTestAttempts.length;

    mySubmissions.forEach(sub => {
      totalMarksObtained += (sub.marks || 0);
      totalMaxMarks += (maxMarksMap[sub.assignmentId.toString()] || 0);
    });

    myTestAttempts.forEach(ta => {
      totalMarksObtained += (ta.score || 0);
      totalMaxMarks += (maxMarksMap[ta.testId.toString()] || 0);
    });

    student.averageMarks = totalMaxMarks > 0 ? ((totalMarksObtained / totalMaxMarks) * 100).toFixed(1) : 0;
    student.testsAttended = testsAttended;
  });

  res.status(200).json(successResponse(students));
});

/**
 * @route   GET /api/students/:id/performance
 * @access  Professor only
 * @desc    Get detailed performance chart data for a specific student
 */
const getStudentProfile = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'professor') {
    return next(new ApiError(403, 'FORBIDDEN', 'Only professors can view student profiles'));
  }

  const studentId = req.params.id;
  const student = await User.findById(studentId).select('name email avatarUrl');
  if (!student) {
    return next(new ApiError(404, 'NOT_FOUND', 'Student not found'));
  }

  const classrooms = await Classroom.find({ professorId: req.user._id });
  const classroomIds = classrooms.map(c => c._id);

  const isEnrolled = await Enrollment.findOne({ studentId: studentId, classroomId: { $in: classroomIds }, deletedAt: null });
  if (!isEnrolled) {
    return next(new ApiError(403, 'FORBIDDEN', 'This student is not enrolled in any of your classes'));
  }

  const assignments = await Assignment.find({ classroomId: { $in: classroomIds } });
  const tests = await Test.find({ classroomId: { $in: classroomIds } });
  const assignmentIds = assignments.map(a => a._id);
  const testIds = tests.map(t => t._id);

  const submissions = await Submission.find({ studentId, assignmentId: { $in: assignmentIds } }).populate('assignmentId', 'title maxMarks dueDate classroomId');
  const testAttempts = await TestAttempt.find({ studentId, testId: { $in: testIds } }).populate('testId', 'title maxMarks scheduledAt classroomId');

  const chartData = [];
  
  submissions.forEach(sub => {
    if (sub.status === 'graded') {
      chartData.push({
        name: sub.assignmentId.title,
        date: sub.submittedAt || sub.updatedAt,
        score: sub.marks,
        maxScore: sub.assignmentId.maxMarks || 100,
        type: 'Assignment'
      });
    }
  });

  testAttempts.forEach(ta => {
    if (ta.status === 'completed') {
      chartData.push({
        name: ta.testId.title,
        date: ta.endTime || ta.updatedAt,
        score: ta.score,
        maxScore: ta.testId.maxMarks || 100,
        type: 'Test'
      });
    }
  });

  chartData.sort((a, b) => new Date(a.date) - new Date(b.date));

  const formattedChartData = chartData.map(d => ({
    ...d,
    dateString: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    percentage: d.maxScore > 0 ? Math.round((d.score / d.maxScore) * 100) : 0
  }));

  res.status(200).json(successResponse({
    student,
    chartData: formattedChartData,
    totalAssignments: submissions.length,
    totalTests: testAttempts.length
  }));
});

module.exports = {
  getTeacherStudents,
  getStudentProfile,
};
