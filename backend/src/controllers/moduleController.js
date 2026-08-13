const Module = require('../models/Module');
const Course = require('../models/Course');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Helper to check course access
 */
const getCourseAndCheckAccess = async (courseId, user) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'NOT_FOUND', 'Course not found');

  const isOwner = course.professorId.toString() === user._id.toString();
  
  if (user.role === 'professor' && !isOwner) {
    throw new ApiError(403, 'FORBIDDEN', 'Not authorized');
  }

  return { course, isOwner };
};

/**
 * @route   GET /api/courses/:courseId/modules
 * @access  Authenticated (Professor own, or Student enrolled)
 */
const getModules = asyncHandler(async (req, res, next) => {
  const { course } = await getCourseAndCheckAccess(req.params.courseId, req.user);

  if (req.user.role === 'student') {
    const Enrollment = require('../models/Enrollment');
    const enrollment = await Enrollment.findOne({ courseId: course._id, studentId: req.user._id });
    if (!enrollment) {
      return next(new ApiError(403, 'FORBIDDEN', 'Not enrolled in this course'));
    }
  }

  const modules = await Module.find({ courseId: course._id }).sort('order');
  
  // Future: aggregate materialCount, assignmentCount, quizCount here
  
  res.status(200).json(successResponse(modules));
});

/**
 * @route   POST /api/courses/:courseId/modules
 * @access  Professor (Owner only)
 */
const createModule = asyncHandler(async (req, res, next) => {
  await getCourseAndCheckAccess(req.params.courseId, req.user);

  const { title, description, order } = req.body;

  const newModule = await Module.create({
    courseId: req.params.courseId,
    title,
    description,
    order,
  });

  res.status(201).json(successResponse(newModule));
});

/**
 * @route   GET /api/modules/:id
 * @access  Authenticated (Professor own, or Student enrolled)
 */
const getModuleById = asyncHandler(async (req, res, next) => {
  const module = await Module.findById(req.params.id);
  if (!module) return next(new ApiError(404, 'NOT_FOUND', 'Module not found'));

  const { course } = await getCourseAndCheckAccess(module.courseId, req.user);

  if (req.user.role === 'student') {
    const Enrollment = require('../models/Enrollment');
    const enrollment = await Enrollment.findOne({ courseId: course._id, studentId: req.user._id });
    if (!enrollment) {
      return next(new ApiError(403, 'FORBIDDEN', 'Not enrolled in this course'));
    }
  }

  // Future: populate materials, assignments, quizzes
  res.status(200).json(successResponse(module));
});

/**
 * @route   PATCH /api/modules/:id
 * @access  Professor (Owner only)
 */
const updateModule = asyncHandler(async (req, res, next) => {
  const module = await Module.findById(req.params.id);
  if (!module) return next(new ApiError(404, 'NOT_FOUND', 'Module not found'));

  await getCourseAndCheckAccess(module.courseId, req.user);

  const { title, description, order } = req.body;
  if (title) module.title = title;
  if (description) module.description = description;
  if (order !== undefined) module.order = order;

  await module.save();

  res.status(200).json(successResponse(module));
});

/**
 * @route   DELETE /api/modules/:id
 * @access  Professor (Owner only)
 */
const deleteModule = asyncHandler(async (req, res, next) => {
  const module = await Module.findById(req.params.id);
  if (!module) return next(new ApiError(404, 'NOT_FOUND', 'Module not found'));

  await getCourseAndCheckAccess(module.courseId, req.user);

  module.deletedAt = new Date();
  await module.save();

  res.status(200).json(successResponse({}, 'Module deleted'));
});

/**
 * @route   PATCH /api/modules/reorder
 * @access  Professor (Owner only)
 */
const reorderModules = asyncHandler(async (req, res, next) => {
  const { courseId, order } = req.body;
  // order is array of { moduleId, order }
  
  await getCourseAndCheckAccess(courseId, req.user);

  const bulkOps = order.map((item) => ({
    updateOne: {
      filter: { _id: item.moduleId, courseId },
      update: { order: item.order }
    }
  }));

  if (bulkOps.length > 0) {
    await Module.bulkWrite(bulkOps);
  }

  res.status(200).json(successResponse({}, 'Modules reordered'));
});

module.exports = {
  getModules,
  createModule,
  getModuleById,
  updateModule,
  deleteModule,
  reorderModules,
};
