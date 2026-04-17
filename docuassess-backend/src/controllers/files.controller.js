const FileRecord = require('../models/fileRecord.model');
const logger = require('../utils/logger');

/**
 * GET /api/v1/files/:fileId
 * Returns metadata + pipeline status for a given fileId.
 */
const getFileRecord = async (req, res) => {
  const { fileId } = req.params;

  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).json({
      success: false,
      error: { message: 'fileId param is required', code: 'INVALID_PARAMS' },
    });
  }

  let record;
  try {
    record = await FileRecord.findOne(
      { fileId },
      // Never expose filePath or chunk content to the client
      { fileId: 1, originalName: 1, sizeMb: 1, uploadedAt: 1,
        pageCount: 1, charCount: 1, chunkCount: 1, status: 1, error: 1 }
    ).lean();
  } catch (err) {
    logger.error(`[files.controller] DB error for fileId ${fileId}: ${err.message}`);
    return res.status(500).json({
      success: false,
      error: { message: 'Database error', code: 'DB_ERROR' },
    });
  }

  if (!record) {
    return res.status(404).json({
      success: false,
      error: { message: `No record found for fileId: ${fileId}`, code: 'FILE_NOT_FOUND' },
    });
  }

  return res.status(200).json({ success: true, data: record });
};

module.exports = { getFileRecord };