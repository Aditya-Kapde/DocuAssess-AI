const { processUploadWithExtraction, deleteFile } = require('../services/upload.service');
const logger = require('../utils/logger');

const uploadFile = async (req, res, next) => {
  const { file } = req;

  if (!file) {
    return res.status(400).json({
      success: false,
      error: { message: 'No file uploaded. Send a PDF under the "file" field.' },
    });
  }

  try {
    const { fileRecord, extraction, chunking } = await processUploadWithExtraction(file);

    const response = {
      success: true,
      message: 'File uploaded successfully',
      fileId: fileRecord.fileId,
      meta: {
        originalName: fileRecord.originalName,
        sizeMb: fileRecord.sizeMb,
        uploadedAt: fileRecord.uploadedAt,
        pageCount: extraction.pageCount,
        charCount: extraction.charCount,
        chunks: chunking
          ? { count: chunking.chunkCount, averageWordCount: chunking.averageWordCount }
          : null,
      },
    };

    if (extraction.warning) {
      response.warning = extraction.warning;
    }

    const statusCode = extraction.warning ? 207 : 201;
    return res.status(statusCode).json(response);

  } catch (err) {
    if (file?.path) await deleteFile(file.path);
    logger.error(`[upload.controller] Unhandled error: ${err.message}`);
    next(err);
  }
};

module.exports = { uploadFile };