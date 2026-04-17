const { Router } = require('express');
const upload = require('../config/multer.config');
const { uploadFile } = require('../controllers/upload.controller');
const validateRequest = require('../middleware/validateRequest');
const { uploadedFileSchema } = require('../validators/upload.validator');

const router = Router();

router.post(
  '/',
  // 1. Multer: parse multipart, apply type/size filter, write to disk
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        // Multer-specific errors (size exceeded, wrong type)
        const status = err.status || 400;
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? `File too large. Maximum allowed size is ${process.env.MAX_FILE_SIZE_MB || 20}MB`
            : err.message || 'File upload error';

        return res.status(status).json({
          success: false,
          error: { message },
        });
      }
      next();
    });
  },
  // 2. Validate the parsed file object against Zod schema
  validateRequest(uploadedFileSchema, 'file'),
  // 3. Controller
  uploadFile
);

module.exports = router;