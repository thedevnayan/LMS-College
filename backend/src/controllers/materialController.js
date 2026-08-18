const Material = require('../models/Material');
const Classroom = require('../models/Classroom');
const Course = require('../models/Course');
const MaterialProgress = require('../models/MaterialProgress');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Helper to get classroom and verify access
 */
const getAccessDetails = async (classroomId, user) => {
  const classroom = await Classroom.findById(classroomId).populate('courseId');
  if (!classroom) throw new ApiError(404, 'NOT_FOUND', 'Classroom not found');

  const course = classroom.courseId;
  const isOwner = classroom.professorId.toString() === user._id.toString();

  if (user.role === 'student') {
    const Enrollment = require('../models/Enrollment');
    const enrollment = await Enrollment.findOne({ courseId: course._id, studentId: user._id });
    if (!enrollment) {
      throw new ApiError(403, 'FORBIDDEN', 'Not enrolled in this course');
    }
  } else if (!isOwner) {
    throw new ApiError(403, 'FORBIDDEN', 'Not authorized');
  }

  return { classroom, course, isOwner };
};

/**
 * @route   GET /api/classrooms/:classroomId/materials
 * @access  Authenticated (Professor own, or Student enrolled)
 */
const getMaterials = asyncHandler(async (req, res, next) => {
  await getAccessDetails(req.params.classroomId, req.user);

  let materials = await Material.find({ classroomId: req.params.classroomId }).sort('createdAt').lean();

  if (req.user.role === 'student') {
    const materialIds = materials.map((m) => m._id);
    const progress = await MaterialProgress.find({
      studentId: req.user._id,
      materialId: { $in: materialIds }
    }).lean();

    const progressMap = {};
    progress.forEach((p) => {
      progressMap[p.materialId] = p.completed;
    });

    materials = materials.map((m) => ({
      ...m,
      completed: !!progressMap[m._id]
    }));
  }

  res.status(200).json(successResponse(materials));
});

/**
 * @route   GET /api/materials
 * @access  Professor (All materials for all their classrooms)
 */
const getAllMaterialsForProfessor = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'professor') {
    return next(new ApiError(403, 'FORBIDDEN', 'Only professors can view all materials'));
  }

  const classrooms = await Classroom.find({ professorId: req.user._id }).select('_id');
  const classroomIds = classrooms.map(c => c._id);

  const materials = await Material.find({ classroomId: { $in: classroomIds } })
    .populate({
      path: 'classroomId',
      select: 'courseId classBatch type labBatch',
      populate: { path: 'courseId', select: 'title' }
    })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(successResponse(materials));
});

/**
 * @route   POST /api/classrooms/:classroomId/materials
 * @access  Professor (Owner only)
 */
const createMaterial = asyncHandler(async (req, res, next) => {
  await getAccessDetails(req.params.classroomId, req.user);

  const { title, topic, type, content, description, order } = req.body;
  let url = req.body.url;

  // If a file was uploaded via multer+cloudinary, it will be in req.file.path
  if (req.file && req.file.path) {
    url = req.file.path;
  }

  if (!url && type !== 'text') {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'File or URL is required for this material type'));
  }

  const material = await Material.create({
    classroomId: req.params.classroomId,
    title,
    topic,
    type,
    url,
    content,
    description,
    order: order || 1,
  });

  res.status(201).json(successResponse(material));
});

/**
 * @route   GET /api/materials/:id
 * @access  Authenticated
 */
const getMaterialById = asyncHandler(async (req, res, next) => {
  const material = await Material.findById(req.params.id)
    .populate({
      path: 'classroomId',
      select: 'courseId classBatch type labBatch',
      populate: { path: 'courseId', select: 'title' }
    })
    .lean();

  if (!material) return next(new ApiError(404, 'NOT_FOUND', 'Material not found'));

  await getAccessDetails(material.classroomId._id || material.classroomId, req.user);

  if (req.user.role === 'student') {
    const progress = await MaterialProgress.findOne({
      studentId: req.user._id,
      materialId: material._id,
    });
    material.completed = progress ? progress.completed : false;
  }

  res.status(200).json(successResponse(material));
});

/**
 * @route   PATCH /api/materials/:id
 * @access  Professor
 */
const updateMaterial = asyncHandler(async (req, res, next) => {
  const material = await Material.findById(req.params.id);
  if (!material) return next(new ApiError(404, 'NOT_FOUND', 'Material not found'));

  await getAccessDetails(material.classroomId, req.user);

  const { title, topic, type, content, description, order } = req.body;
  let url = req.body.url;

  if (req.file && req.file.path) {
    url = req.file.path;
  }

  if (title) material.title = title;
  if (topic) material.topic = topic;
  if (type) material.type = type;
  if (url !== undefined) material.url = url;
  if (content !== undefined) material.content = content;
  if (description !== undefined) material.description = description;
  if (order !== undefined) material.order = order;

  await material.save();

  res.status(200).json(successResponse(material));
});

/**
 * @route   DELETE /api/materials/:id
 * @access  Professor
 */
const deleteMaterial = asyncHandler(async (req, res, next) => {
  const material = await Material.findById(req.params.id);
  if (!material) return next(new ApiError(404, 'NOT_FOUND', 'Material not found'));

  await getAccessDetails(material.classroomId, req.user);

  material.deletedAt = new Date();
  await material.save();

  res.status(200).json(successResponse({}, 'Material deleted'));
});

module.exports = {
  getMaterials,
  getAllMaterialsForProfessor,
  createMaterial,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
};
