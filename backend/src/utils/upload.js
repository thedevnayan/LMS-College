const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { ApiError } = require('../middleware/errorHandler');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = file.originalname.split('.').pop();
    const isImage = file.mimetype.startsWith('image/');
    const baseName = file.originalname.substring(0, file.originalname.lastIndexOf('.')) || file.originalname;
    
    return {
      folder: 'lms_materials',
      resource_type: 'auto', // Automatically detects image, raw (pdf, docx, pptx) or video
      format: undefined, // Let cloudinary keep original format
      public_id: isImage ? `${Date.now()}-${baseName}` : `${Date.now()}-${baseName}.${ext}`
    };
  },
});

const fileFilter = (req, file, cb) => {
  // Allow common material formats
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'UPLOAD_ERROR', 'Invalid file type. Only PDF, PPT, Word, and Images are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

module.exports = { upload, cloudinary };
