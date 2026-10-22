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
  const { courseOfferingId, type, practicalGroupIds } = req.body;

  if (!courseOfferingId) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Course offering is required'));
  }

  // Fetch the course offering
  const CourseOffering = require('../models/CourseOffering');
  const offering = await CourseOffering.findById(courseOfferingId).populate('courseId academicSessionId teachingGroupId');
  
  if (!offering) {
    return next(new ApiError(404, 'NOT_FOUND', 'Course offering not found'));
  }
  
  // Optional: check permissions (e.g., if user is primary teacher or admin)
  if (offering.primaryTeacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
     return next(new ApiError(403, 'FORBIDDEN', 'You are not the primary teacher for this course offering'));
  }

  const courseId = offering.courseId._id;
  const sessionName = offering.academicSessionId ? offering.academicSessionId.name : 'Default Session';

  const group = offering.teachingGroupId;
  if (!group) throw new ApiError(409, 'INVALID_OFFERING', 'Offering must belong to a batch');
  const labels = { teachingGroupId: group._id, classBatch: group.name.replace(/^Batch\s+/i, '').toUpperCase() };
  const finalLabBatches = type === 'lab' && Array.isArray(practicalGroupIds) ? practicalGroupIds : [];

  if (type === 'lab' && !finalLabBatches.length) throw new ApiError(400, 'INVALID_LAB', 'Select a lab group');
  try {
    const createdClassrooms = await require('mongoose').connection.transaction(async session => {
    const createdClassrooms = [];
    const ensureClassroom = async values => {
      // Reuse classrooms created by older allocation flows or a retried request.
      let classroom = await Classroom.findOne({ courseOfferingId, type, practicalGroupId: values.practicalGroupId }).session(session);
      const allocation = await require('../models/FacultyAllocation').findOne({
        courseId, teachingGroupId: group._id, academicSessionId: offering.academicSessionId._id,
        type, practicalGroupId: values.practicalGroupId,
      }).session(session);
      if (!classroom) {
        [classroom] = await Classroom.create([{ ...values, professorId: allocation?.facultyId || values.professorId }], { session });
      } else {
        classroom.set(labels);
        if (values.labBatch) classroom.labBatch = values.labBatch;
        if (!classroom.enrollmentExpiresAt) classroom.enrollmentExpiresAt = values.enrollmentExpiresAt;
        await classroom.save({ session });
      }
      if (allocation) {
        allocation.classroomId = classroom._id;
        await allocation.save({ session });
      }
      return classroom;
    };
    if (type === 'lab' && finalLabBatches.length > 0) {
      for (const pgId of finalLabBatches) {
        const pg = await PracticalGroup.findOne({ _id: pgId, teachingGroupId: group._id });
        if (!pg || (pg.courseOfferingId && String(pg.courseOfferingId) !== String(offering._id))) throw new ApiError(400, 'INVALID_LAB', 'Lab must belong to this offering and batch');
        const classroom = await ensureClassroom({
          ...labels, labBatch: pg.name.toUpperCase(),
          courseOfferingId,
          courseId,
          professorId: offering.primaryTeacherId,
          enrollmentExpiresAt: new Date(Date.now() + 7 * 86400000),
          session: sessionName,
          type,
          practicalGroupId: pgId,
        });
        await classroom.populate('courseId', 'title description thumbnail');
        createdClassrooms.push(classroom);
      }
    } else {
      const classroom = await ensureClassroom({
        ...labels,
        courseOfferingId,
        courseId,
        professorId: offering.primaryTeacherId,
        enrollmentExpiresAt: new Date(Date.now() + 7 * 86400000),
        session: sessionName,
        type,
        practicalGroupId: null,
      });
      await classroom.populate('courseId', 'title description thumbnail');
      createdClassrooms.push(classroom);
    }

    return createdClassrooms;
    });
    res.status(201).json(successResponse(createdClassrooms, 'Classroom(s) ready'));
  } catch (err) {
    if (err.code === 11000) {
      return next(new ApiError(409, 'CLASSROOM_EXISTS', 'A classroom of this type already exists for this offering/practical group'));
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

      if (req.user.role === 'student') { delete obj.enrollmentToken; delete obj.joinCode; delete obj.allowedEmails; }
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
  if (req.user.role === 'student') { delete classroomData.enrollmentToken; delete classroomData.joinCode; delete classroomData.allowedEmails; }

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
const getBatchCodes = asyncHandler(async (req, res) => {
    const data = await require('../services/batchAdministration').listInvitations(req.query.session);
    res.json(successResponse(data));
  });

/**
 * @route   POST /api/classrooms/join
 * @access  Student only
 * @desc    Join via single batch code OR individual classroom code
 */
const joinClassroom = asyncHandler(async (req, res) => {
    throw new ApiError(410, 'INVITATION_REQUIRED', 'Use the administrator-provided enrollment QR invitation. Short join codes are no longer accepted.');
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

  if (req.user.role !== 'admin' && classroom.professorId.toString() !== req.user._id.toString()) {
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

  if (req.user.role !== 'admin' && classroom.professorId.toString() !== req.user._id.toString()) {
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
  classroom.enrollmentExpiresAt = new Date(Date.now() + 7 * 86400000);
  classroom.enrollmentToken = uuidv4(); // Regenerate enrollment token (invalidates old QR)
  await classroom.save();

  res.status(200).json(successResponse({ joinCode: code, enrollmentToken: classroom.enrollmentToken }, 'Join code and QR regenerated'));
});

const toggleBatchLogin = asyncHandler(async (req, res) => {
    const { setBatchAccess } = require('../services/batchAdministration');
    const data = await setBatchAccess([req.params.id], req.body.loginEnabled, req.user);
    res.json(successResponse(data[0], 'Batch access updated'));
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
