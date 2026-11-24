const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('./errorHandler');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// The stored file's extension always comes from this table, never from the
// name the client sent: a file called "x.html" or "x.svg" must not end up on
// disk with that extension, or the static /uploads route would serve it as a
// web page on the API's origin.
const EXTENSION = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi',
  'application/pdf': '.pdf',
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const original = path.basename(String(file.originalname || 'datei'));
    const sanitizedName = original
      .replace(/\.[^.]*$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    cb(null, `${uuidv4()}_${sanitizedName}${EXTENSION[file.mimetype] || '.bin'}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type ${file.mimetype} is not allowed`, 400, 'INVALID_FILE_TYPE'), false);
  }
};

const category = (type) => {
  if (ALLOWED_IMAGE_TYPES.includes(type)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(type)) return 'video';
  if (ALLOWED_DOCUMENT_TYPES.includes(type)) return 'document';
  return null;
};

const getMaxSize = (file) => {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) return MAX_VIDEO_SIZE;
  if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) return MAX_DOCUMENT_SIZE;
  return MAX_IMAGE_SIZE;
};

// What the file really is, judged by its first bytes (the type the client
// sends is only a claim). Returns one of the allowed types or null.
function sniff(head) {
  const at = (offset, text) => head.length >= offset + text.length
    && head.toString('latin1', offset, offset + text.length) === text;
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (at(0, '\x89PNG\r\n\x1a\n')) return 'image/png';
  if (at(0, 'GIF87a') || at(0, 'GIF89a')) return 'image/gif';
  if (at(0, 'RIFF') && at(8, 'WEBP')) return 'image/webp';
  if (at(0, 'RIFF') && at(8, 'AVI ')) return 'video/x-msvideo';
  if (at(0, '%PDF-')) return 'application/pdf';
  if (at(4, 'ftyp')) {
    const brand = head.toString('latin1', 8, 12);
    return brand === 'qt  ' ? 'video/quicktime' : 'video/mp4';
  }
  // Older QuickTime files start with an atom other than ftyp
  if (['moov', 'mdat', 'wide', 'free', 'skip', 'pnot'].some((atom) => at(4, atom))) return 'video/quicktime';
  return null;
}

function readHead(file) {
  const fd = fs.openSync(file.path, 'r');
  try {
    const head = Buffer.alloc(16);
    const n = fs.readSync(fd, head, 0, 16, 0);
    return head.subarray(0, n);
  } finally {
    fs.closeSync(fd);
  }
}

function filesOf(req) {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') return Object.values(req.files).flat();
  return [];
}

function removeAll(files) {
  for (const f of files) {
    try { if (f.path) fs.unlinkSync(f.path); } catch { /* already gone */ }
  }
}

// After multer stored the files: check the real content against the claimed
// type, apply the size limit of that type and give every file the extension of
// its real type. Any failure removes ALL files of the request.
function verifyFiles(req) {
  const files = filesOf(req);
  for (const file of files) {
    const real = sniff(readHead(file));
    if (!real || category(real) !== category(file.mimetype)) {
      removeAll(files);
      return new AppError('Die Datei ist kein gültiges Bild, Video oder PDF.', 400, 'INVALID_FILE_CONTENT');
    }
    file.mimetype = real;
    if (file.size > getMaxSize(file)) {
      removeAll(files);
      const maxMB = Math.round(getMaxSize(file) / (1024 * 1024));
      return new AppError(`Die Datei ist zu groß (höchstens ${maxMB} MB).`, 413, 'FILE_TOO_LARGE');
    }
    const ext = EXTENSION[real];
    if (path.extname(file.filename) !== ext) {
      const filename = file.filename.replace(/\.[^.]*$/, '') + ext;
      const target = path.join(path.dirname(file.path), filename);
      fs.renameSync(file.path, target);
      file.filename = filename;
      file.path = target;
    }
  }
  return null;
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // largest type; the per-type limit is checked in verifyFiles
    files: 10,
    fields: 50,
    fieldSize: 1024 * 1024,
  },
});

// Wrap multer so it ONLY runs on multipart/form-data requests. Without this,
// multer's .single/.array on a JSON request can wipe req.body (or race with
// express.json), producing 400 VALIDATION_ERROR on requests that were valid JSON.
const skipUnlessMultipart = (mw) => (req, res, next) => {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (!ct.startsWith('multipart/form-data')) return next();
  return mw(req, res, (err) => {
    if (err) { removeAll(filesOf(req)); return next(err); }
    let failure;
    try { failure = verifyFiles(req); } catch (e) { removeAll(filesOf(req)); failure = e; }
    return next(failure || undefined);
  });
};

// Single image upload (avatar, post image)
const uploadSingle = (fieldName = 'image') => skipUnlessMultipart(upload.single(fieldName));

// Multiple images (post gallery, ticket attachments)
const uploadMultiple = (fieldName = 'images', maxCount = 10) => skipUnlessMultipart(upload.array(fieldName, maxCount));

// Mixed upload (different field names)
const uploadFields = (fields) => skipUnlessMultipart(upload.fields(fields));

// Kept for callers that still chain it: the checks now run inside the upload
// middlewares above.
const validateFileSize = (req, res, next) => next();

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  validateFileSize,
  sniff,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_DOCUMENT_TYPES,
};
