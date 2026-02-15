const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('./errorHandler');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.resolve(__dirname, '../../uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = file.originalname
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    cb(null, `${uuidv4()}_${sanitizedName}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type ${file.mimetype} is not allowed`, 400, 'INVALID_FILE_TYPE'), false);
  }
};

const getMaxSize = (file) => {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) return MAX_VIDEO_SIZE;
  if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) return MAX_DOCUMENT_SIZE;
  return MAX_IMAGE_SIZE;
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Use max possible, we check per-type in middleware
    files: 10,
  },
});

// Single image upload (avatar, post image)
const uploadSingle = (fieldName = 'image') => upload.single(fieldName);

// Multiple images (post gallery, ticket attachments)
const uploadMultiple = (fieldName = 'images', maxCount = 10) => upload.array(fieldName, maxCount);

// Mixed upload (different field names)
const uploadFields = (fields) => upload.fields(fields);

// File size validation middleware (run after multer)
const validateFileSize = (req, res, next) => {
  const files = req.file ? [req.file] : req.files || [];
  const fileList = Array.isArray(files) ? files : Object.values(files).flat();

  for (const file of fileList) {
    const maxSize = getMaxSize(file);
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      return next(new AppError(`File ${file.originalname} exceeds ${maxMB}MB limit`, 413, 'FILE_TOO_LARGE'));
    }
  }
  next();
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  validateFileSize,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_DOCUMENT_TYPES,
};
