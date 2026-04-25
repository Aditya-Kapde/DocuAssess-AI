const { Router } = require('express');
const uploadRoutes   = require('./upload.routes');
const generateRoutes = require('./generate.routes');
const filesRoutes    = require('./files.routes');
const exportRoutes   = require('./export.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

router.use('/upload',   uploadRoutes);
router.use('/generate', generateRoutes);
router.use('/files',    filesRoutes);
router.use('/export',   exportRoutes);

module.exports = router;