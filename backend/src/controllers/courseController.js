const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, paginatedResponse } = require('../utils/response');
const paginate = require('../utils/paginate');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @route   GET /api/courses
 * @access  Authenticated
 */
const getCourses = asyncHandler(async (req, res, next) => {
  const filter = {};

  if (req.user.role === 'professor') {
    // Professor sees their own courses
    filter.professorId = req.user._id;
  } else {
    // Student sees published courses, unless they only want enrolled ones
    if (req.query.mine === 'true') {
      const enrollments = await Enrollment.find({ studentId: req.user._id });
      const courseIds = enrollments.map((e) => e.courseId);
      filter._id = { $in: courseIds };
    } else {
      filter.published = true;
    }
  }

  // Search by title
  if (req.query.search) {
    filter.title = { $regex: req.query.search, $options: 'i' };
  }

  const result = await paginate(Course, filter, req.query);

  res.status(200).json(paginatedResponse(result.data, result.meta));
});

/**
 * @route   POST /api/courses
 * @access  Professor only
 */
const createCourse = asyncHandler(async (req, res, next) => {
  const { title, description, thumbnail } = req.body;

  const course = await Course.create({
    title,
    description,
    thumbnail,
    professorId: req.user._id,
  });

  res.status(201).json(successResponse(course));
});

/**
 * @route   GET /api/courses/:id
 * @access  Authenticated (Professor own, or Student enrolled/published)
 */
const getCourseById = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new ApiError(404, 'NOT_FOUND', 'Course not found'));
  }

  const isOwner = course.professorId.toString() === req.user._id.toString();

  if (req.user.role === 'student') {
    // Must be published OR enrolled
    const enrollment = await Enrollment.findOne({ courseId: course._id, studentId: req.user._id });
    if (!course.published && !enrollment) {
      return next(new ApiError(403, 'FORBIDDEN', 'Course is not published'));
    }
  } else if (!isOwner) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized to view this course'));
  }

  res.status(200).json(successResponse(course));
});

/**
 * @route   PATCH /api/courses/:id
 * @access  Professor (Owner only)
 */
const updateCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new ApiError(404, 'NOT_FOUND', 'Course not found'));
  }

  if (course.professorId.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized to edit this course'));
  }

  const { title, description, thumbnail } = req.body;
  
  if (title) course.title = title;
  if (description) course.description = description;
  if (thumbnail) course.thumbnail = thumbnail;

  await course.save();

  res.status(200).json(successResponse(course));
});

/**
 * @route   DELETE /api/courses/:id
 * @access  Professor (Owner only)
 */
const deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new ApiError(404, 'NOT_FOUND', 'Course not found'));
  }

  if (course.professorId.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized to delete this course'));
  }

  // Soft delete
  course.deletedAt = new Date();
  await course.save(); // triggers pre-save hook to cascade soft delete

  res.status(200).json(successResponse({}, 'Course deleted'));
});

/**
 * @route   POST /api/courses/:id/publish
 * @access  Professor (Owner only)
 */
const publishCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new ApiError(404, 'NOT_FOUND', 'Course not found'));
  }

  if (course.professorId.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized to publish this course'));
  }

  course.published = req.body.published === true;
  await course.save();

  res.status(200).json(successResponse(course));
});

/**
 * @route   POST /api/courses/:id/enroll
 * @access  Student only
 */
const enrollCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course || !course.published) {
    return next(new ApiError(404, 'NOT_FOUND', 'Course not found or unpublished'));
  }

  try {
    const enrollment = await Enrollment.create({
      studentId: req.user._id,
      courseId: course._id,
    });
    res.status(201).json(successResponse(enrollment));
  } catch (err) {
    if (err.code === 11000) {
      return next(new ApiError(409, 'ALREADY_ENROLLED', 'Student is already enrolled in this course'));
    }
    next(err);
  }
});

/**
 * @route   GET /api/courses/:id/students
 * @access  Professor (Owner only)
 */
const getCourseStudents = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new ApiError(404, 'NOT_FOUND', 'Course not found'));
  }

  if (course.professorId.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized'));
  }

  const filter = { courseId: course._id };
  
  // Note: batchId filter will be added in Phase 3

  const result = await paginate(Enrollment, filter, req.query, {
    populate: { path: 'studentId', select: 'name email avatarUrl' }
  });

  // Map to the requested format
  const mappedData = result.data.map(e => ({
    studentId: e.studentId._id,
    name: e.studentId.name,
    email: e.studentId.email,
    enrolledAt: e.enrolledAt,
    batchId: e.batchId,
    // batchName will be handled later
  }));

  res.status(200).json(paginatedResponse(mappedData, result.meta));
});

module.exports = {
  getCourses,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
  publishCourse,
  enrollCourse,
  getCourseStudents,
};
