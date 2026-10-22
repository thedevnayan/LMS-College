const Material = require('../models/Material');
const Classroom = require('../models/Classroom');
const Course = require('../models/Course');
const MaterialProgress = require('../models/MaterialProgress');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/response');
const { storeFile, removeStoredFile, downloadUrl } = require('../services/fileStorage');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Helper to get classroom and verify access
 */
const { classroomAccess: getAccessDetails } = require('../services/access');

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

  res.status(200).json(successResponse(materials.map(publicMaterial)));
});

/**
 * @route   GET /api/materials
 * @access  Professor (All materials for all their classrooms)
 */
const getAllMaterialsForProfessor = asyncHandler(async (req, res, next) => {
  if (!['professor', 'admin', 'teacher'].includes(req.user.role)) {
    return next(new ApiError(403, 'FORBIDDEN', 'Only faculty and administrators can view materials'));
  }

  const classrooms = req.user.role === 'admin'
    ? await Classroom.find().select('_id')
    : await Classroom.find({ professorId: req.user._id }).select('_id');
  const classroomIds = classrooms.map(c => c._id);

  const materials = await Material.find({ classroomId: { $in: classroomIds } })
    .populate({
      path: 'classroomId',
      select: 'courseId classBatch type labBatch',
      populate: { path: 'courseId', select: 'title' }
    })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(successResponse(materials.map(publicMaterial)));
});

/**
 * @route   POST /api/classrooms/:classroomId/materials
 * @access  Professor (Owner only)
 */
const createMaterial = asyncHandler(async (req, res, next) => {
  await getAccessDetails(req.params.classroomId, req.user);

  const { title, topic, type, content, description, order } = req.body;
  const files = req.files || (req.file ? [req.file] : []);
  if (type === 'image' && files.length) {
    const images = [];
    try {
      // Validate every image before uploading any of them.
      for (const file of files) {
        const detected = await require('../services/fileStorage').detectFile(file.path);
        if (!detected.mime.startsWith('image/') || detected.mime !== file.mimetype) throw new ApiError(400, 'INVALID_FILE', 'Select valid PNG, JPEG or WebP images');
      }
      for (const file of files) images.push(await storeFile(file));
      const material = await Material.create({ classroomId: req.params.classroomId, title, topic, type, content, description, order: order || 1, images });
      return res.status(201).json(successResponse(publicMaterial(material)));
    } catch (error) {
      await Promise.allSettled(images.map(removeStoredFile));
      throw error;
    }
  }
  if (files.length > 1) throw new ApiError(400, 'INVALID_FILE', 'Multiple files are supported for image resources only');
  req.file = files[0];
  let url = req.body.url;

  // If a file was uploaded via multer+cloudinary, it will be in req.file.path
  const storage = req.file ? await storeFile(req.file) : undefined;
  if (storage) url = '';
  if (url && !/^https?:\/\//i.test(url)) throw new ApiError(400, 'INVALID_URL', 'Use an HTTP or HTTPS link');

  if (!url && !storage && type !== 'text') {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'File or URL is required for this material type'));
  }

  let material;
  try { material = await Material.create({
    classroomId: req.params.classroomId,
    storage,
    title,
    topic,
    type,
    url,
    content,
    description,
    order: order || 1,
  }); } catch (error) { await removeStoredFile(storage).catch(() => {}); throw error; }

  res.status(201).json(successResponse(publicMaterial(material)));
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

  res.status(200).json(successResponse(publicMaterial(material)));
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

  const storage = req.file ? await storeFile(req.file) : undefined;
  if (storage) url = '';
  if (url && !/^https?:\/\//i.test(url)) throw new ApiError(400, 'INVALID_URL', 'Use an HTTP or HTTPS link');

  const previousStorage = material.storage;
  if (storage) material.storage = storage;
  else if (url) material.storage = undefined;
  if (title) material.title = title;
  if (topic) material.topic = topic;
  if (type) material.type = type;
  if (url !== undefined) material.url = url;
  if (content !== undefined) material.content = content;
  if (description !== undefined) material.description = description;
  if (order !== undefined) material.order = order;

  try { await material.save(); } catch (error) { await removeStoredFile(storage).catch(() => {}); throw error; }
  if (storage || url) await removeStoredFile(previousStorage).catch(() => console.error('Storage cleanup needed for replaced material'));

  res.status(200).json(successResponse(publicMaterial(material)));
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

/**
 * @route   POST /api/materials/:id/progress
 * @access  Student
 */
const markProgress = asyncHandler(async (req, res, next) => {
  const material = await Material.findById(req.params.id);
  if (!material) return next(new ApiError(404, 'NOT_FOUND', 'Material not found'));

  const { course } = await getAccessDetails(material.classroomId, req.user);

  if (req.user.role !== 'student') {
    return next(new ApiError(403, 'FORBIDDEN', 'Only students can mark progress'));
  }

  const { completed } = req.body;

  let progress = await MaterialProgress.findOne({
    studentId: req.user._id,
    materialId: material._id,
  });

  if (!progress) {
    progress = new MaterialProgress({
      studentId: req.user._id,
      materialId: material._id,
      courseId: course._id,
    });
  }

  progress.completed = completed;
  await progress.save();

  res.status(200).json(successResponse(progress));
});

function publicMaterial(value) {
  const data = value.toObject ? value.toObject() : { ...value };
  if (data.storage?.publicId) { data.privateFile = true; data.fileFormat = data.storage.format; data.url = ''; }
  delete data.storage;
  if (data.images?.length) {
    data.privateFile = true;
    data.fileFormat = data.images[0].format;
    data.images = data.images.map((image, index) => ({ index, name: image.originalName, format: image.format }));
  }
  return data;
}
const downloadMaterial = asyncHandler(async (req,res) => {
  const material = await Material.findById(req.params.id);
  if (!material) throw new ApiError(404,'NOT_FOUND','Material unavailable');
  await getAccessDetails(material.classroomId, req.user);
  const index = req.params.imageIndex;
  if (index !== undefined && !/^\d+$/.test(index)) throw new ApiError(400,'INVALID_ID','Invalid image index');
  const storage = index !== undefined ? material.images?.[Number(index)] : material.storage?.publicId ? material.storage : material.images?.[0];
  if (!storage?.publicId) throw new ApiError(404,'NOT_FOUND','Private file unavailable');
  const upstream = await fetch(downloadUrl(storage), { signal: AbortSignal.timeout(30000) });
  if (!upstream.ok || !upstream.body) throw new ApiError(502,'STORAGE_UNAVAILABLE','File is unavailable; contact staff');
  res.set({ 'Content-Type': storage.mime, 'Content-Disposition': 'inline; filename="' + storage.originalName.replace(/"/g,'_') + '"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  const { pipeline } = require('node:stream/promises');
  await pipeline(require('node:stream').Readable.fromWeb(upstream.body), res);
});
module.exports = { downloadMaterial,
  getMaterials,
  getAllMaterialsForProfessor,
  createMaterial,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
  markProgress,
};
