const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const appConfig = require('./app.config');

// Ensure uploads directory exists at startup
const uploadDir = path.resolve(appConfig.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, _file, cb) => {
    // Format: <uuid>.pdf — never trust original filename
    const uniqueName = `${uuidv4()}.pdf`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedMimeTypes = ['application/pdf'];
  const allowedExtension = '.pdf';
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) &&
    ext === allowedExtension
  ) {
    cb(null, true);
  } else {
    const error = new Error('Only PDF files are allowed');
    error.status = 415; // Unsupported Media Type
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: appConfig.maxFileSizeMb * 1024 * 1024,
    files: 1,
  },
});

module.exports = upload;