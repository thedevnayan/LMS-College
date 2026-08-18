const Classroom = require('../models/Classroom');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, paginatedResponse } = require('../utils/response');
const paginate = require('../utils/paginate');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @route   POST /api/classrooms
 * @access  Professor only
 * @desc    Create a new classroom with auto-generated 6-digit join code
 */
const createClassroom = asyncHandler(async (req, res, next) => {
  const { courseId, session, classBatch, type, labBatches } = req.body;

  // Verify the course exists and belongs to this professor
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ApiError(404, 'NOT_FOUND', 'Course not found'));
  }
  if (course.professorId.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'You can only create classrooms for your own courses'));
  }

  // Ensure labBatches is an array if lab
  const finalLabBatches = type === 'lab' && Array.isArray(labBatches) ? labBatches : [];

  try {
    let createdClassrooms = [];
    if (type === 'lab' && finalLabBatches.length > 0) {
      // Create one classroom per lab batch
      for (const lb of finalLabBatches) {
        const classroom = await Classroom.create({
          courseId,
          professorId: req.user._id,
          session,
          classBatch: classBatch.toUpperCase(),
          type,
          labBatch: lb,
        });
        await classroom.populate('courseId', 'title description thumbnail');
        createdClassrooms.push(classroom);
      }
    } else {
      // Theory or no lab batches provided
      const classroom = await Classroom.create({
        courseId,
        professorId: req.user._id,
        session,
        classBatch: classBatch.toUpperCase(),
        type,
        labBatch: null,
      });
      await classroom.populate('courseId', 'title description thumbnail');
      createdClassrooms.push(classroom);
    }

    res.status(201).json(successResponse(createdClassrooms, 'Classroom(s) created successfully'));
  } catch (err) {
    if (err.code === 11000) {
      return next(new ApiError(409, 'CLASSROOM_EXISTS', 'A classroom with this session, batch, and type already exists for this course'));
    }
    next(err);
  }
});

/**
 * @route   GET /api/classrooms
 * @access  Professor only
 * @desc    List all classrooms owned by this professor
 */
const getClassrooms = asyncHandler(async (req, res, next) => {
  const filter = { professorId: req.user._id };

  // Optional filters
  if (req.query.session) {
    filter.session = req.query.session;
  }
  if (req.query.type) {
    filter.type = req.query.type;
  }
  if (req.query.search) {
    filter.classBatch = { $regex: req.query.search, $options: 'i' };
  }

  const result = await paginate(Classroom, filter, req.query, {
    populate: { path: 'courseId', select: 'title description thumbnail' },
    sort: { createdAt: -1 },
  });

  // Attach student count for each classroom
  const classrooms = await Promise.all(
    result.data.map(async (classroom) => {
      const obj = classroom.toObject ? classroom.toObject() : { ...classroom };
      obj.studentCount = await Enrollment.countDocuments({
        classroomId: classroom._id,
        deletedAt: null,
      });
      return obj;
    })
  );

  res.status(200).json(paginatedResponse(classrooms, result.meta));
});

/**
 * @route   GET /api/classrooms/:id
 * @access  Professor (owner) or Student (enrolled)
 * @desc    Get classroom details
 */
const getClassroomById = asyncHandler(async (req, res, next) => {
  const classroom = await Classroom.findById(req.params.id)
    .populate('courseId', 'title description thumbnail published');

  if (!classroom) {
    return next(new ApiError(404, 'NOT_FOUND', 'Classroom not found'));
  }

  const isOwner = classroom.professorId.toString() === req.user._id.toString();

  if (req.user.role === 'student') {
    // Check if student is enrolled in this classroom
    const enrollment = await Enrollment.findOne({
      classroomId: classroom._id,
      studentId: req.user._id,
    });
    if (!enrollment) {
      return next(new ApiError(403, 'FORBIDDEN', 'You are not enrolled in this classroom'));
    }
  } else if (!isOwner) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized to view this classroom'));
  }

  const classroomData = classroom.toObject();

  // Attach student count
  classroomData.studentCount = await Enrollment.countDocuments({
    classroomId: classroom._id,
    deletedAt: null,
  });

  res.status(200).json(successResponse(classroomData));
});

/**
 * @route   PATCH /api/classrooms/:id
 * @access  Professor (owner only)
 * @desc    Update classroom details
 */
const updateClassroom = asyncHandler(async (req, res, next) => {
  const classroom = await Classroom.findById(req.params.id);

  if (!classroom) {
    return next(new ApiError(404, 'NOT_FOUND', 'Classroom not found'));
  }

  if (classroom.professorId.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized'));
  }

  const { session, classBatch, type, labBatch, isActive, maxStudents } = req.body;

  if (session) classroom.session = session;
  if (classBatch) classroom.classBatch = classBatch.toUpperCase();
  if (type) {
    classroom.type = type;
    if (type === 'theory') {
      classroom.labBatch = null;
    }
  }
  if (labBatch !== undefined) {
    classroom.labBatch = labBatch;
  }
  if (typeof isActive === 'boolean') classroom.isActive = isActive;
  if (maxStudents !== undefined) classroom.maxStudents = maxStudents;

  try {
    await classroom.save();
    await classroom.populate('courseId', 'title description thumbnail');
    res.status(200).json(successResponse(classroom));
  } catch (err) {
    if (err.code === 11000) {
      return next(new ApiError(409, 'CLASSROOM_EXISTS', 'A classroom with this configuration already exists'));
    }
    next(err);
  }
});

/**
 * @route   DELETE /api/classrooms/:id
 * @access  Professor (owner only)
 * @desc    Soft-delete classroom
 */
const deleteClassroom = asyncHandler(async (req, res, next) => {
  const classroom = await Classroom.findById(req.params.id);

  if (!classroom) {
    return next(new ApiError(404, 'NOT_FOUND', 'Classroom not found'));
  }

  if (classroom.professorId.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized'));
  }

  classroom.deletedAt = new Date();
  await classroom.save();

  res.status(200).json(successResponse({}, 'Classroom deleted'));
});

/**
 * @route   POST /api/classrooms/join
 * @access  Student only
 * @desc    Join a classroom via 6-digit code
 */
const joinClassroom = asyncHandler(async (req, res, next) => {
  const { joinCode } = req.body;

  if (!joinCode || joinCode.length !== 6) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'A valid 6-character join code is required'));
  }

  const classroom = await Classroom.findOne({
    joinCode: joinCode.toUpperCase(),
    isActive: true,
  }).populate('courseId', 'title description thumbnail');

  if (!classroom) {
    return next(new ApiError(404, 'NOT_FOUND', 'Invalid or expired join code'));
  }

  // Check max students
  if (classroom.maxStudents) {
    const currentCount = await Enrollment.countDocuments({
      classroomId: classroom._id,
      deletedAt: null,
    });
    if (currentCount >= classroom.maxStudents) {
      return next(new ApiError(409, 'CLASSROOM_FULL', 'This classroom has reached its maximum capacity'));
    }
  }

  // Check if already enrolled in this classroom
  const existingEnrollment = await Enrollment.findOne({
    studentId: req.user._id,
    classroomId: classroom._id,
  });

  if (existingEnrollment) {
    return next(new ApiError(409, 'ALREADY_ENROLLED', 'You are already enrolled in this classroom'));
  }

  // Check if already enrolled in the course (through another classroom)
  let enrollment = await Enrollment.findOne({
    studentId: req.user._id,
    courseId: classroom.courseId._id,
  });

  if (enrollment) {
    // Update existing enrollment to also link to this classroom
    enrollment.classroomId = classroom._id;
    await enrollment.save();
  } else {
    // Create new enrollment
    enrollment = await Enrollment.create({
      studentId: req.user._id,
      courseId: classroom.courseId._id,
      classroomId: classroom._id,
      labBatch: classroom.type === 'lab' ? classroom.labBatch : null,
    });
  }

  // Also publish the course if it isn't already (so the student can access content)
  if (!classroom.courseId.published) {
    await Course.findByIdAndUpdate(classroom.courseId._id, { published: true });
  }

  res.status(201).json(
    successResponse(
      {
        enrollment,
        classroom: {
          _id: classroom._id,
          session: classroom.session,
          classBatch: classroom.classBatch,
          type: classroom.type,
          labBatch: classroom.labBatch,
          courseName: classroom.courseId.title,
        },
      },
      'Successfully joined the classroom!'
    )
  );
});

/**
 * @route   GET /api/classrooms/:id/students
 * @access  Professor (owner only)
 * @desc    List students enrolled in classroom
 */
const getClassroomStudents = asyncHandler(async (req, res, next) => {
  const classroom = await Classroom.findById(req.params.id);

  if (!classroom) {
    return next(new ApiError(404, 'NOT_FOUND', 'Classroom not found'));
  }

  if (classroom.professorId.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized'));
  }

  const result = await paginate(
    Enrollment,
    { classroomId: classroom._id },
    req.query,
    { populate: { path: 'studentId', select: 'name email avatarUrl' } }
  );

  const mappedData = result.data.map((e) => ({
    studentId: e.studentId._id,
    name: e.studentId.name,
    email: e.studentId.email,
    avatarUrl: e.studentId.avatarUrl,
    labBatch: e.labBatch,
    enrolledAt: e.enrolledAt,
  }));

  res.status(200).json(paginatedResponse(mappedData, result.meta));
});

/**
 * @route   POST /api/classrooms/:id/regenerate-code
 * @access  Professor (owner only)
 * @desc    Generate a new join code for the classroom
 */
const regenerateCode = asyncHandler(async (req, res, next) => {
  const classroom = await Classroom.findById(req.params.id);

  if (!classroom) {
    return next(new ApiError(404, 'NOT_FOUND', 'Classroom not found'));
  }

  if (classroom.professorId.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized'));
  }

  // Generate new code with collision check
  let code;
  let attempts = 0;
  do {
    code = Classroom.generateJoinCode();
    attempts++;
    const existing = await Classroom.findOne({ joinCode: code }).lean();
    if (!existing) break;
  } while (attempts < 10);

  if (attempts >= 10) {
    return next(new ApiError(500, 'SERVER_ERROR', 'Failed to generate unique code'));
  }

  classroom.joinCode = code;
  await classroom.save();

  res.status(200).json(successResponse({ joinCode: code }, 'Join code regenerated'));
});

module.exports = {
  createClassroom,
  getClassrooms,
  getClassroomById,
  updateClassroom,
  deleteClassroom,
  joinClassroom,
  getClassroomStudents,
  regenerateCode,
};
