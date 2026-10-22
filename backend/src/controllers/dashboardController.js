const Classroom = require('../models/Classroom');
const Enrollment = require('../models/Enrollment');
const Material = require('../models/Material');
const MaterialProgress = require('../models/MaterialProgress');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const getStudentDashboard = asyncHandler(async (req,res) => {
  const enrollments = await Enrollment.find({studentId:req.user._id}).populate('courseId','title thumbnail published').lean();
  const ids=enrollments.map(e=>e.classroomId).filter(Boolean);
  const materials=await Material.find({classroomId:{$in:ids}}).select('_id classroomId').lean();
  const progress=await MaterialProgress.find({studentId:req.user._id,materialId:{$in:materials.map(m=>m._id)},completed:true}).select('materialId').lean();
  const done=new Set(progress.map(p=>String(p.materialId)));
  const enrolledCourses=enrollments.filter(e=>e.courseId).map(e=>{const list=materials.filter(m=>String(m.classroomId)===String(e.classroomId));return {course:e.courseId,enrolledAt:e.enrolledAt,progress:list.length?Math.round(100*list.filter(m=>done.has(String(m._id))).length/list.length):0};});
  const upcomingDeadlines=await Assignment.find({classroomId:{$in:ids},status:{$nin:['draft','archived']},startDate:{$lte:new Date()},dueDate:{$gte:new Date()}}).select('title dueDate classroomId').sort('dueDate').limit(5).lean();
  res.json(successResponse({enrolledCourses,upcomingDeadlines}));
});
const getProfessorDashboard=asyncHandler(async(req,res)=>{
  const classes=await Classroom.find(req.user.role==='admin'?{}:{professorId:req.user._id}).select('_id courseId').lean();const ids=classes.map(c=>c._id);
  const students=await Enrollment.distinct('studentId',{classroomId:{$in:ids},deletedAt:null});
  const assignments=await Assignment.find({classroomId:{$in:ids}}).select('_id');
  const pendingSubmissions=await Submission.find({assignmentId:{$in:assignments.map(a=>a._id)},status:'pending'}).sort('-submittedAt').limit(10).populate('assignmentId','title').populate('studentId','name email').lean();
  res.json(successResponse({totalCourses:new Set(classes.map(c=>String(c.courseId))).size,totalStudents:students.length,pendingSubmissions}));
});
module.exports={getStudentDashboard,getProfessorDashboard};
