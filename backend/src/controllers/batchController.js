const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Helper to check course ownership
 */
const checkCourseOwnership = async (courseId, userId) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'NOT_FOUND', 'Course not found');

  if (course.professorId.toString() !== userId.toString()) {
    throw new ApiError(403, 'FORBIDDEN', 'Not authorized');
  }

  return course;
};

/**
 * Helper to get batch and check ownership
 */
const getBatchAndCheckOwnership = async (batchId, userId) => {
  const batch = await Batch.findById(batchId);
  if (!batch) throw new ApiError(404, 'NOT_FOUND', 'Batch not found');

  await checkCourseOwnership(batch.courseId, userId);
  return batch;
};

/**
 * @route   GET /api/courses/:courseId/batches
 * @access  Professor (Owner only)
 */
const getCourseBatches = asyncHandler(async (req, res, next) => {
  await checkCourseOwnership(req.params.courseId, req.user._id);

  const batches = await Batch.find({ courseId: req.params.courseId }).lean();
  
  // Attach student count for each batch
  for (let i = 0; i < batches.length; i++) {
    batches[i].studentCount = await Enrollment.countDocuments({ batchId: batches[i]._id });
  }

  res.status(200).json(successResponse(batches));
});

/**
 * @route   POST /api/courses/:courseId/batches
 * @access  Professor (Owner only)
 */
const createBatch = asyncHandler(async (req, res, next) => {
  await checkCourseOwnership(req.params.courseId, req.user._id);

  const { name, description } = req.body;

  try {
    const batch = await Batch.create({
      courseId: req.params.courseId,
      name,
      description,
    });
    res.status(201).json(successResponse(batch));
  } catch (err) {
    if (err.code === 11000) {
      return next(new ApiError(409, 'BATCH_NAME_EXISTS', 'A batch with this name already exists in the course'));
    }
    next(err);
  }
});

/**
 * @route   GET /api/batches/:id
 * @access  Professor (Owner of parent course)
 */
const getBatchById = asyncHandler(async (req, res, next) => {
  const batch = await getBatchAndCheckOwnership(req.params.id, req.user._id);

  // Populate students
  const enrollments = await Enrollment.find({ batchId: batch._id }).populate('studentId', 'name email');
  
  const batchData = batch.toObject();
  batchData.students = enrollments.map((e) => ({
    studentId: e.studentId._id,
    name: e.studentId.name,
    email: e.studentId.email,
  }));

  res.status(200).json(successResponse(batchData));
});

/**
 * @route   PATCH /api/batches/:id
 * @access  Professor (Owner of parent course)
 */
const updateBatch = asyncHandler(async (req, res, next) => {
  const batch = await getBatchAndCheckOwnership(req.params.id, req.user._id);

  const { name, description } = req.body;
  if (name) batch.name = name;
  if (description !== undefined) batch.description = description;

  try {
    await batch.save();
    res.status(200).json(successResponse(batch));
  } catch (err) {
    if (err.code === 11000) {
      return next(new ApiError(409, 'BATCH_NAME_EXISTS', 'A batch with this name already exists in the course'));
    }
    next(err);
  }
});

/**
 * @route   DELETE /api/batches/:id
 * @access  Professor (Owner of parent course)
 */
const deleteBatch = asyncHandler(async (req, res, next) => {
  const batch = await getBatchAndCheckOwnership(req.params.id, req.user._id);

  batch.deletedAt = new Date();
  await batch.save(); // triggers pre-save hook to nullify batchId on enrollments

  res.status(200).json(successResponse({}, 'Batch deleted'));
});

/**
 * @route   POST /api/batches/:id/assign
 * @access  Professor (Owner of parent course)
 */
const assignStudents = asyncHandler(async (req, res, next) => {
  const batch = await getBatchAndCheckOwnership(req.params.id, req.user._id);
  const { studentIds } = req.body;

  if (!Array.isArray(studentIds)) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'studentIds must be an array'));
  }

  // Verify all students are actually enrolled in this course
  const validEnrollments = await Enrollment.find({
    studentId: { $in: studentIds },
    courseId: batch.courseId,
  });

  if (validEnrollments.length !== studentIds.length) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'One or more students are not enrolled in this course'));
  }

  // Bulk update
  const result = await Enrollment.updateMany(
    { studentId: { $in: studentIds }, courseId: batch.courseId },
    { batchId: batch._id }
  );

  res.status(200).json(successResponse({ assignedCount: result.modifiedCount }, 'Students assigned to batch'));
});

/**
 * @route   DELETE /api/batches/:id/students/:studentId
 * @access  Professor (Owner of parent course)
 */
const unassignStudent = asyncHandler(async (req, res, next) => {
  const batch = await getBatchAndCheckOwnership(req.params.id, req.user._id);
  
  const enrollment = await Enrollment.findOneAndUpdate(
    { studentId: req.params.studentId, courseId: batch.courseId, batchId: batch._id },
    { batchId: null },
    { new: true }
  );

  if (!enrollment) {
    return next(new ApiError(404, 'NOT_FOUND', 'Student is not in this batch'));
  }

  res.status(200).json(successResponse({}, 'Student unassigned from batch'));
});

module.exports = {
  getCourseBatches,
  createBatch,
  getBatchById,
  updateBatch,
  deleteBatch,
  assignStudents,
  unassignStudent,
};
