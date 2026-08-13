const Material = require('../models/Material');
const Module = require('../models/Module');
const Course = require('../models/Course');
const MaterialProgress = require('../models/MaterialProgress');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Helper to check access
 */
const getAccessDetails = async (moduleId, user) => {
  const moduleObj = await Module.findById(moduleId);
  if (!moduleObj) throw new ApiError(404, 'NOT_FOUND', 'Module not found');

  const course = await Course.findById(moduleObj.courseId);
  if (!course) throw new ApiError(404, 'NOT_FOUND', 'Course not found');

  const isOwner = course.professorId.toString() === user._id.toString();

  if (user.role === 'student') {
    const Enrollment = require('../models/Enrollment');
    const enrollment = await Enrollment.findOne({ courseId: course._id, studentId: user._id });
    if (!enrollment) {
      throw new ApiError(403, 'FORBIDDEN', 'Not enrolled in this course');
    }
  } else if (!isOwner) {
    throw new ApiError(403, 'FORBIDDEN', 'Not authorized');
  }

  return { moduleObj, course };
};

/**
 * @route   GET /api/modules/:moduleId/materials
 * @access  Authenticated (Professor own, or Student enrolled)
 */
const getMaterials = asyncHandler(async (req, res, next) => {
  const { course } = await getAccessDetails(req.params.moduleId, req.user);

  let materials = await Material.find({ moduleId: req.params.moduleId }).sort('order').lean();

  if (req.user.role === 'student') {
    // Inject completed status
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
 * @route   POST /api/modules/:moduleId/materials
 * @access  Professor (Owner only)
 */
const createMaterial = asyncHandler(async (req, res, next) => {
  await getAccessDetails(req.params.moduleId, req.user);

  const { title, type, url, content, description, order } = req.body;

  const material = await Material.create({
    moduleId: req.params.moduleId,
    title,
    type,
    url,
    content,
    description,
    order,
  });

  res.status(201).json(successResponse(material));
});

/**
 * @route   GET /api/materials/:id
 * @access  Authenticated (Professor own, or Student enrolled)
 */
const getMaterialById = asyncHandler(async (req, res, next) => {
  const material = await Material.findById(req.params.id).lean();
  if (!material) return next(new ApiError(404, 'NOT_FOUND', 'Material not found'));

  await getAccessDetails(material.moduleId, req.user);

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
 * @access  Professor (Owner only)
 */
const updateMaterial = asyncHandler(async (req, res, next) => {
  const material = await Material.findById(req.params.id);
  if (!material) return next(new ApiError(404, 'NOT_FOUND', 'Material not found'));

  await getAccessDetails(material.moduleId, req.user);

  const { title, type, url, content, description, order } = req.body;
  if (title) material.title = title;
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
 * @access  Professor (Owner only)
 */
const deleteMaterial = asyncHandler(async (req, res, next) => {
  const material = await Material.findById(req.params.id);
  if (!material) return next(new ApiError(404, 'NOT_FOUND', 'Material not found'));

  await getAccessDetails(material.moduleId, req.user);

  material.deletedAt = new Date();
  await material.save();

  res.status(200).json(successResponse({}, 'Material deleted'));
});

/**
 * @route   POST /api/materials/:id/progress
 * @access  Student (Enrolled only)
 */
const markProgress = asyncHandler(async (req, res, next) => {
  const material = await Material.findById(req.params.id);
  if (!material) return next(new ApiError(404, 'NOT_FOUND', 'Material not found'));

  const { course } = await getAccessDetails(material.moduleId, req.user);

  const completed = req.body.completed === true;

  await MaterialProgress.findOneAndUpdate(
    { studentId: req.user._id, materialId: material._id },
    {
      studentId: req.user._id,
      materialId: material._id,
      courseId: course._id,
      completed,
      completedAt: completed ? new Date() : null,
    },
    { upsert: true, new: true, runValidators: true }
  );

  // Recalculate course progress percentage
  const totalMaterials = await Material.countDocuments({
    moduleId: { $in: await Module.find({ courseId: course._id }).distinct('_id') }
  });

  const completedMaterials = await MaterialProgress.countDocuments({
    studentId: req.user._id,
    courseId: course._id,
    completed: true,
  });

  const courseProgressPercent = totalMaterials === 0 ? 0 : Math.round((completedMaterials / totalMaterials) * 100);

  res.status(200).json(successResponse({
    materialId: material._id,
    completed,
    courseProgressPercent,
  }));
});

module.exports = {
  getMaterials,
  createMaterial,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
  markProgress,
};
