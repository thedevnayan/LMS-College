const Classroom = require('../models/Classroom');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const BatchJoinCode = require('../models/BatchJoinCode');
const TeachingGroup = require('../models/TeachingGroup');
const PracticalGroup = require('../models/PracticalGroup');
const StudentEnrollment = require('../models/StudentEnrollment');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse, paginatedResponse } = require('../utils/response');
const paginate = require('../utils/paginate');
const { ApiError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

const generateUniqueBatchCode = async (prefix = 'BAT') => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 10; i++) {
    let rand = '';
    for (let j = 0; j < 4; j++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `${prefix}-${rand}`;
    const exists = await BatchJoinCode.findOne({ code });
    if (!exists) return code;
  }
  return `${prefix}-${Date.now().toString().slice(-4)}`;
};

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
  let filter = {};

  if (req.user.role === 'student') {
    // For students, find all classrooms they are enrolled in
    const enrollments = await Enrollment.find({ studentId: req.user._id, deletedAt: null });
    const classroomIds = enrollments.map(e => e.classroomId);
    filter = { _id: { $in: classroomIds } };
  } else if (req.user.role === 'admin') {
    // For administrators, show all classrooms across the institution unless filtered by professor
    if (req.query.professorId) {
      filter = { professorId: req.query.professorId };
    } else {
      filter = {};
    }
  } else {
    // For professors and teachers, find all classrooms they created
    filter = { professorId: req.user._id };
  }

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

      if (req.user.role === 'student') {
        const myEnrollment = await Enrollment.findOne({
          classroomId: classroom._id,
          studentId: req.user._id,
          deletedAt: null,
        });
        if (myEnrollment && myEnrollment.labBatch) {
          obj.labBatch = myEnrollment.labBatch;
        }
      }

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
  } else if (!isOwner && req.user.role !== 'admin') {
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

  if (classroom.professorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
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

  if (classroom.professorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized'));
  }

  classroom.deletedAt = new Date();
  await classroom.save();

  res.status(200).json(successResponse({}, 'Classroom deleted'));
});

/**
 * @route   GET /api/classrooms/batch-codes
 * @access  Admin, Professor
 * @desc    Get or auto-generate single onboarding codes for all batches and sub-batches
 */
const getBatchCodes = asyncHandler(async (req, res, next) => {
  const { session } = req.query;

  // Build filter for classrooms
  const filter = { isActive: true, deletedAt: null };
  if (session) {
    filter.session = session;
  }

  // Find all active classrooms
  const classrooms = await Classroom.find(filter).populate('courseId', 'title code');

  // Group classrooms by session and classBatch
  const batchMap = {};

  for (const c of classrooms) {
    const s = c.session;
    const b = c.classBatch;
    if (!s || !b) continue;

    const key = `${s}__${b}`;
    if (!batchMap[key]) {
      batchMap[key] = {
        session: s,
        classBatch: b,
        theoryClassrooms: [],
        labClassrooms: [],
        labBatchesSet: new Set(),
      };
    }

    if (c.type === 'theory') {
      batchMap[key].theoryClassrooms.push(c);
    } else if (c.type === 'lab') {
      batchMap[key].labClassrooms.push(c);
      if (c.labBatch) {
        batchMap[key].labBatchesSet.add(c.labBatch);
      }
    }
  }

  const result = [];

  for (const key of Object.keys(batchMap)) {
    const item = batchMap[key];
    const labBatches = Array.from(item.labBatchesSet).sort();

    // 1. Ensure Master Batch Code exists
    let masterCodeDoc = await BatchJoinCode.findOne({
      session: item.session,
      classBatch: item.classBatch,
      labBatch: null,
      isActive: true,
      deletedAt: null,
    });

    if (!masterCodeDoc) {
      const prefix = `BAT-${item.classBatch}`;
      const code = await generateUniqueBatchCode(prefix);
      masterCodeDoc = await BatchJoinCode.create({
        code,
        session: item.session,
        classBatch: item.classBatch,
        labBatch: null,
      });
    }

    // 2. Ensure Sub-Batch codes exist for each lab batch (e.g. B1, B2)
    const subBatchCodes = [];
    for (const lb of labBatches) {
      let subDoc = await BatchJoinCode.findOne({
        session: item.session,
        classBatch: item.classBatch,
        labBatch: lb,
        isActive: true,
        deletedAt: null,
      });

      if (!subDoc) {
        const prefix = `${item.classBatch}${lb}`;
        const code = await generateUniqueBatchCode(prefix);
        subDoc = await BatchJoinCode.create({
          code,
          session: item.session,
          classBatch: item.classBatch,
          labBatch: lb,
        });
      }

      const matchingLabs = item.labClassrooms.filter(c => c.labBatch === lb);

      subBatchCodes.push({
        _id: subDoc._id,
        labBatch: lb,
        code: subDoc.code,
        enrollmentToken: subDoc.enrollmentToken,
        labClassesCount: matchingLabs.length,
        totalClassesCount: item.theoryClassrooms.length + matchingLabs.length,
      });
    }

    result.push({
      session: item.session,
      classBatch: item.classBatch,
      masterCode: masterCodeDoc.code,
      masterCodeId: masterCodeDoc._id,
      masterEnrollmentToken: masterCodeDoc.enrollmentToken,
      loginEnabled: masterCodeDoc.loginEnabled !== false,
      theoryClassesCount: item.theoryClassrooms.length,
      labClassesCount: item.labClassrooms.length,
      totalTheoryCourses: Array.from(new Set(item.theoryClassrooms.map(c => c.courseId?.title || 'Unknown'))),
      subBatches: subBatchCodes,
    });
  }

  res.status(200).json(successResponse(result));
});

/**
 * @route   POST /api/classrooms/join
 * @access  Student only
 * @desc    Join via single batch code OR individual classroom code
 */
const joinClassroom = asyncHandler(async (req, res, next) => {
  const { joinCode, labBatch: requestedLabBatch } = req.body;

  if (!joinCode) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'A join code is required'));
  }

  const cleanCode = joinCode.trim().toUpperCase();

  // 1. FIRST: Check if this code is a BatchJoinCode
  const batchCodeDoc = await BatchJoinCode.findOne({
    code: cleanCode,
    isActive: true,
    deletedAt: null,
  });

  if (batchCodeDoc) {
    const { session, classBatch } = batchCodeDoc;
    const targetLabBatch = (batchCodeDoc.labBatch || requestedLabBatch || '').toUpperCase() || null;

    // Check if this is a master code (labBatch === null) and no labBatch was provided
    if (!targetLabBatch) {
      const availableLabs = await Classroom.distinct('labBatch', {
        session,
        classBatch,
        type: 'lab',
        isActive: true,
        deletedAt: null,
      });

      const validLabs = availableLabs.filter(Boolean);

      if (validLabs.length > 0) {
        // Prompt the student to select their lab group!
        return res.status(200).json(
          successResponse(
            {
              requiresLabSelection: true,
              session,
              classBatch,
              labBatches: validLabs.sort(),
              code: batchCodeDoc.code,
            },
            `Batch ${classBatch} (${session}) found! Please select your Lab Group to join all classes.`
          )
        );
      }
    }

    // Now enroll student into:
    // (a) All theory classrooms for this batch
    const theoryClassrooms = await Classroom.find({
      session,
      classBatch,
      type: 'theory',
      isActive: true,
      deletedAt: null,
    }).populate('courseId', 'title description published');

    // (b) All lab classrooms for this batch matching targetLabBatch (if any)
    const labFilter = {
      session,
      classBatch,
      type: 'lab',
      isActive: true,
      deletedAt: null,
    };
    if (targetLabBatch) {
      labFilter.labBatch = targetLabBatch;
    }
    const labClassrooms = await Classroom.find(labFilter).populate('courseId', 'title description published');

    const allClassesToJoin = [...theoryClassrooms, ...labClassrooms];

    if (allClassesToJoin.length === 0) {
      return next(new ApiError(404, 'NOT_FOUND', `No active classrooms found for Batch ${classBatch} (${session})`));
    }

    const enrolledList = [];

    for (const c of allClassesToJoin) {
      let enr = await Enrollment.findOne({
        studentId: req.user._id,
        classroomId: c._id,
      });

      if (!enr) {
        enr = await Enrollment.create({
          studentId: req.user._id,
          courseId: c.courseId._id,
          classroomId: c._id,
          labBatch: c.type === 'lab' ? c.labBatch : null,
        });
      }

      if (c.courseId && !c.courseId.published) {
        await Course.findByIdAndUpdate(c.courseId._id, { published: true });
      }

      enrolledList.push({
        classroomId: c._id,
        courseName: c.courseId?.title,
        type: c.type,
        labBatch: c.labBatch,
      });
    }

    // Optional: link student to TeachingGroup and StudentEnrollment if available
    try {
      const tg = await TeachingGroup.findOne({
        name: new RegExp(`^Batch ${classBatch}$|^${classBatch}$`, 'i'),
        deletedAt: null,
      });
      if (tg) {
        const existingStudentEnr = await StudentEnrollment.findOne({
          studentId: req.user._id,
          teachingGroupId: tg._id,
          status: 'Active',
        });
        if (!existingStudentEnr) {
          const instId = tg.institutionId || req.user.institutionId;
          if (instId) {
            await StudentEnrollment.create({
              studentId: req.user._id,
              institutionId: instId,
              programId: tg.programId,
              cohortId: tg.cohortId,
              academicSessionId: tg.academicSessionId,
              academicPeriodId: tg.academicPeriodId,
              teachingGroupId: tg._id,
              status: 'Active',
              educationGap: 'None (Continuous Enrollment)',
            });
          }
        }
      }
    } catch (tgErr) {
      console.error('Non-critical: failed to sync TeachingGroup on batch join', tgErr);
    }

    const labMsg = targetLabBatch ? ` (Lab ${targetLabBatch})` : '';
    return res.status(201).json(
      successResponse(
        {
          isBatch: true,
          batch: classBatch,
          labBatch: targetLabBatch,
          session,
          enrolledCount: enrolledList.length,
          classrooms: enrolledList,
        },
        `Successfully joined all ${enrolledList.length} classes for Batch ${classBatch}${labMsg}!`
      )
    );
  }

  // 2. SECOND: Check if this code matches an individual Classroom.joinCode
  const classroom = await Classroom.findOne({
    joinCode: cleanCode,
    isActive: true,
    deletedAt: null,
  }).populate('courseId', 'title description thumbnail published');

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

  // Check existing enrollment
  let enrollment = await Enrollment.findOne({
    studentId: req.user._id,
    classroomId: classroom._id,
  });

  if (enrollment) {
    return next(new ApiError(409, 'ALREADY_ENROLLED', 'You are already enrolled in this classroom'));
  }

  enrollment = await Enrollment.create({
    studentId: req.user._id,
    courseId: classroom.courseId._id,
    classroomId: classroom._id,
    labBatch: classroom.type === 'lab' ? classroom.labBatch : null,
  });

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
      `Successfully joined ${classroom.courseId.title}!`
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
  classroom.enrollmentToken = uuidv4(); // Regenerate enrollment token (invalidates old QR)
  await classroom.save();

  res.status(200).json(successResponse({ joinCode: code, enrollmentToken: classroom.enrollmentToken }, 'Join code and QR regenerated'));
});

const toggleBatchLogin = asyncHandler(async (req, res, next) => {
  const batchCode = await BatchJoinCode.findById(req.params.id);
  if (!batchCode) return next(new ApiError(404, 'NOT_FOUND', 'Batch code not found'));
  
  if (req.user.role !== 'admin' && req.user.role !== 'professor') {
    return next(new ApiError(403, 'FORBIDDEN', 'Not authorized'));
  }

  batchCode.loginEnabled = !batchCode.loginEnabled;
  await batchCode.save();

  res.status(200).json(successResponse({ loginEnabled: batchCode.loginEnabled }, `Login access ${batchCode.loginEnabled ? 'enabled' : 'revoked'} for Batch ${batchCode.classBatch}`));
});

module.exports = {
  createClassroom,
  getClassrooms,
  getClassroomById,
  updateClassroom,
  deleteClassroom,
  joinClassroom,
  getBatchCodes,
  getClassroomStudents,
  regenerateCode,
  toggleBatchLogin,
};
