const multer = require('multer');
const os = require('node:os');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { classroomAccess } = require('../services/access');
const Material = require('../models/Material');
const { ApiError } = require('../middleware/errorHandler');
const parser = multer({ storage: multer.diskStorage({ destination: os.tmpdir(), filename: (req,file,cb) => cb(null, 'skillbery-' + randomUUID()) }), limits: { fileSize: 10 * 1024 * 1024, files: 20, fields: 20, fieldSize: 100 * 1024 } });
const handler = (field, multiple) => async (req,res,next) => {
  try {
    const material = req.params.id ? await Material.findById(req.params.id) : null;
    if (req.params.id && !material) throw new ApiError(404,'NOT_FOUND','Material not found');
    await classroomAccess(material?.classroomId || req.params.classroomId, req.user, true);
    (multiple ? parser.array(field, 20) : parser.single(field))(req,res,err => {
      const cleanup = () => { for (const file of req.files || (req.file ? [req.file] : [])) if (file.path) fs.unlink(file.path).catch(() => {}); };
      res.once('finish',cleanup); res.once('close',cleanup);
      next(err);
    });
  } catch (err) { next(err); }
};
const upload = { single: field => handler(field, false), array: field => handler(field, true) };
module.exports = { upload, cloudinary: require('../services/fileStorage').cloudinary };
