const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Classroom = require('../models/Classroom');
const Enrollment = require('../models/Enrollment');
const BatchJoinCode = require('../models/BatchJoinCode');
const TeachingGroup = require('../models/TeachingGroup');
const StudentEnrollment = require('../models/StudentEnrollment');
const Course = require('../models/Course');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

// ── Helpers ──

const generateTokens = (id) => {
  const accessToken = jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES,
  });
  const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES,
  });
  return { accessToken, refreshToken };
};

const setRefreshCookie = (res, refreshToken) => {
  const days = parseInt(process.env.JWT_REFRESH_EXPIRES) || 7;
  const maxAge = days * 24 * 60 * 60 * 1000;
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
  });
};

/**
 * @route   GET /api/enroll/:token
 * @access  Public
 * @desc    Validate enrollment token and return batch/classroom info for the QR landing page
 */
const getTokenInfo = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  // Try batch-level token first
  const batchCode = await BatchJoinCode.findByToken(token);
  if (batchCode) {
    // Count how many classrooms this batch code would enroll into
    const theoryCount = await Classroom.countDocuments({
      session: batchCode.session,
      classBatch: batchCode.classBatch,
      type: 'theory',
      isActive: true,
      deletedAt: null,
    });

    const labFilter = {
      session: batchCode.session,
      classBatch: batchCode.classBatch,
      type: 'lab',
      isActive: true,
      deletedAt: null,
    };
    if (batchCode.labBatch) {
      labFilter.labBatch = batchCode.labBatch;
    }
    const labCount = await Classroom.countDocuments(labFilter);

    // Check if lab selection is needed (master code with no labBatch specified)
    let availableLabBatches = [];
    if (!batchCode.labBatch) {
      const labs = await Classroom.distinct('labBatch', {
        session: batchCode.session,
        classBatch: batchCode.classBatch,
        type: 'lab',
        isActive: true,
        deletedAt: null,
      });
      availableLabBatches = labs.filter(Boolean).sort();
    }

    return res.status(200).json(successResponse({
      type: 'batch',
      session: batchCode.session,
      classBatch: batchCode.classBatch,
      labBatch: batchCode.labBatch || null,
      totalClasses: theoryCount + labCount,
      requiresLabSelection: availableLabBatches.length > 0,
      availableLabBatches,
    }));
  }

  // Try individual classroom token
  const classroom = await Classroom.findByToken(token);
  if (classroom) {
    await classroom.populate('courseId', 'title description thumbnail');
    return res.status(200).json(successResponse({
      type: 'classroom',
      session: classroom.session,
      classBatch: classroom.classBatch,
      classroomType: classroom.type,
      labBatch: classroom.labBatch,
      courseName: classroom.courseId?.title || 'Unknown Course',
      courseDescription: classroom.courseId?.description || '',
    }));
  }

  return next(new ApiError(404, 'INVALID_TOKEN', 'This enrollment link is invalid or has expired'));
});

/**
 * @route   POST /api/enroll/:token
 * @access  Public
 * @desc    Authenticate (login or register) a student and enroll them via QR token
 */
const enrollWithToken = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { email, password, name, isNewAccount, labBatch: requestedLabBatch } = req.body;

  if (!email || !password) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Email and password are required'));
  }

  // ── Step 1: Authenticate or Register the student ──

  let user;

  if (isNewAccount) {
    // Register new student
    if (!name) {
      return next(new ApiError(400, 'VALIDATION_ERROR', 'Name is required for registration'));
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists. Please log in instead.'));
    }

    user = await User.create({
      name,
      email,
      password,
      role: 'student',
    });
  } else {
    // Login existing student
    user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return next(new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    }
    if (!user.isActive) {
      return next(new ApiError(401, 'UNAUTHORIZED', 'Account is deactivated'));
    }
    if (user.role !== 'student') {
      return next(new ApiError(403, 'FORBIDDEN', 'Only student accounts can enroll via QR code'));
    }
  }

  // ── Step 2: Generate JWT tokens ──

  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshTokens.push(refreshToken);
  if (user.refreshTokens.length > 5) {
    user.refreshTokens.shift();
  }
  await user.save({ validateBeforeSave: false });
  setRefreshCookie(res, refreshToken);

  // ── Step 3: Resolve the token to batch or classroom ──

  // Try batch-level token
  const batchCode = await BatchJoinCode.findByToken(token);
  if (batchCode) {
    const { session, classBatch } = batchCode;
    const targetLabBatch = (batchCode.labBatch || requestedLabBatch || '').toUpperCase() || null;

    // If this is a master code and no lab batch selected, check if selection is needed
    if (!targetLabBatch) {
      const availableLabs = await Classroom.distinct('labBatch', {
        session, classBatch, type: 'lab', isActive: true, deletedAt: null,
      });
      const validLabs = availableLabs.filter(Boolean);

      if (validLabs.length > 0) {
        return res.status(200).json(successResponse({
          requiresLabSelection: true,
          session,
          classBatch,
          labBatches: validLabs.sort(),
          user,
          accessToken,
        }, `Batch ${classBatch} (${session}) found! Please select your Lab Group.`));
      }
    }

    // Enroll in all theory classrooms
    const theoryClassrooms = await Classroom.find({
      session, classBatch, type: 'theory', isActive: true, deletedAt: null,
    }).populate('courseId', 'title description published');

    // Enroll in matching lab classrooms
    const labFilter = { session, classBatch, type: 'lab', isActive: true, deletedAt: null };
    if (targetLabBatch) labFilter.labBatch = targetLabBatch;
    const labClassrooms = await Classroom.find(labFilter).populate('courseId', 'title description published');

    const allClassesToJoin = [...theoryClassrooms, ...labClassrooms];

    if (allClassesToJoin.length === 0) {
      return next(new ApiError(404, 'NOT_FOUND', `No active classrooms found for Batch ${classBatch} (${session})`));
    }

    const enrolledList = [];

    for (const c of allClassesToJoin) {
      let enr = await Enrollment.findOne({ studentId: user._id, classroomId: c._id });
      if (!enr) {
        enr = await Enrollment.create({
          studentId: user._id,
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

    // Sync TeachingGroup if available
    try {
      const tg = await TeachingGroup.findOne({
        name: new RegExp(`^Batch ${classBatch}$|^${classBatch}$`, 'i'),
        deletedAt: null,
      });
      if (tg) {
        const existingStudentEnr = await StudentEnrollment.findOne({
          studentId: user._id, teachingGroupId: tg._id, status: 'Active',
        });
        if (!existingStudentEnr) {
          const instId = tg.institutionId;
          if (instId) {
            await StudentEnrollment.create({
              studentId: user._id,
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
      console.error('Non-critical: failed to sync TeachingGroup on QR enroll', tgErr);
    }

    const labMsg = targetLabBatch ? ` (Lab ${targetLabBatch})` : '';
    return res.status(201).json(successResponse({
      isBatch: true,
      batch: classBatch,
      labBatch: targetLabBatch,
      session,
      enrolledCount: enrolledList.length,
      classrooms: enrolledList,
      user,
      accessToken,
    }, `Successfully enrolled in ${enrolledList.length} classes for Batch ${classBatch}${labMsg}!`));
  }

  // Try individual classroom token
  const classroom = await Classroom.findByToken(token);
  if (classroom) {
    await classroom.populate('courseId', 'title description thumbnail published');

    // Check max students
    if (classroom.maxStudents) {
      const currentCount = await Enrollment.countDocuments({ classroomId: classroom._id, deletedAt: null });
      if (currentCount >= classroom.maxStudents) {
        return next(new ApiError(409, 'CLASSROOM_FULL', 'This classroom has reached its maximum capacity'));
      }
    }

    // Check existing enrollment
    let enrollment = await Enrollment.findOne({ studentId: user._id, classroomId: classroom._id });
    if (enrollment) {
      // Already enrolled — just log them in and redirect
      return res.status(200).json(successResponse({
        alreadyEnrolled: true,
        enrollment,
        classroom: {
          _id: classroom._id,
          session: classroom.session,
          classBatch: classroom.classBatch,
          type: classroom.type,
          labBatch: classroom.labBatch,
          courseName: classroom.courseId.title,
        },
        user,
        accessToken,
      }, `You are already enrolled in ${classroom.courseId.title}!`));
    }

    enrollment = await Enrollment.create({
      studentId: user._id,
      courseId: classroom.courseId._id,
      classroomId: classroom._id,
      labBatch: classroom.type === 'lab' ? classroom.labBatch : null,
    });

    if (!classroom.courseId.published) {
      await Course.findByIdAndUpdate(classroom.courseId._id, { published: true });
    }

    return res.status(201).json(successResponse({
      enrollment,
      classroom: {
        _id: classroom._id,
        session: classroom.session,
        classBatch: classroom.classBatch,
        type: classroom.type,
        labBatch: classroom.labBatch,
        courseName: classroom.courseId.title,
      },
      user,
      accessToken,
    }, `Successfully enrolled in ${classroom.courseId.title}!`));
  }

  return next(new ApiError(404, 'INVALID_TOKEN', 'This enrollment link is invalid or has expired'));
});

module.exports = {
  getTokenInfo,
  enrollWithToken,
};
