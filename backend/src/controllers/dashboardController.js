const Course = require('../models/Course');
const Module = require('../models/Module');
const Material = require('../models/Material');
const MaterialProgress = require('../models/MaterialProgress');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');

/**
 * @route   GET /api/dashboard/student
 * @access  Student
 */
const getStudentDashboard = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;

  // 1. Get Enrollments
  const enrollments = await Enrollment.find({ studentId }).populate('courseId', 'title thumbnail published');
  
  const courseProgress = [];
  const moduleIdsToSearch = [];

  for (const enrollment of enrollments) {
    if (!enrollment.courseId) continue; // safety check if course was deleted without cascade finishing
    const courseId = enrollment.courseId._id;

    // Count Total Materials in this course
    const modules = await Module.find({ courseId }).select('_id');
    const moduleIds = modules.map(m => m._id);
    moduleIdsToSearch.push(...moduleIds);

    const totalMaterials = await Material.countDocuments({ moduleId: { $in: moduleIds } });
    const completedMaterials = await MaterialProgress.countDocuments({
      studentId,
      courseId,
      completed: true,
    });

    let percent = 0;
    if (totalMaterials > 0) {
      percent = Math.round((completedMaterials / totalMaterials) * 100);
    }

    courseProgress.push({
      course: enrollment.courseId,
      enrolledAt: enrollment.enrolledAt,
      progress: percent,
    });
  }

  // 2. Upcoming Deadlines (Assignments due in the future in enrolled modules)
  // Fetch assignments belonging to modules of enrolled courses
  const upcomingAssignments = await Assignment.find({
    moduleId: { $in: moduleIdsToSearch },
    dueDate: { $gte: new Date() },
  })
    .sort('dueDate')
    .limit(5)
    .populate({
      path: 'moduleId',
      select: 'courseId title',
      populate: { path: 'courseId', select: 'title' }
    })
    .lean();

  const data = {
    enrolledCourses: courseProgress,
    upcomingDeadlines: upcomingAssignments,
  };

  res.status(200).json(successResponse(data));
});

/**
 * @route   GET /api/dashboard/professor
 * @access  Professor
 */
const getProfessorDashboard = asyncHandler(async (req, res, next) => {
  const professorId = req.user._id;

  // 1. Active Courses
  const courses = await Course.find({ professorId });
  const courseIds = courses.map(c => c._id);

  // 2. Total Unique Students
  const totalStudents = await Enrollment.distinct('studentId', { courseId: { $in: courseIds } });

  // 3. Submissions needing grading
  // To find submissions, we need assignmentIds for this professor's courses
  const modules = await Module.find({ courseId: { $in: courseIds } });
  const moduleIds = modules.map(m => m._id);

  const assignments = await Assignment.find({ moduleId: { $in: moduleIds } });
  const assignmentIds = assignments.map(a => a._id);

  const recentPendingSubmissions = await Submission.find({
    assignmentId: { $in: assignmentIds },
    status: 'pending',
  })
    .sort('-submittedAt')
    .limit(10)
    .populate('assignmentId', 'title')
    .populate('studentId', 'name email')
    .lean();

  const data = {
    totalCourses: courses.length,
    totalStudents: totalStudents.length,
    pendingSubmissions: recentPendingSubmissions,
  };

  res.status(200).json(successResponse(data));
});

module.exports = {
  getStudentDashboard,
  getProfessorDashboard,
};
