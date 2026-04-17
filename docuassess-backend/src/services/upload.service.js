const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { extractText } = require('./pdf.service');
const { chunkText } = require('./chunk.service');

const processUpload = async (file) => {
  const fileId = path.basename(file.filename, '.pdf');

  const record = {
    fileId,
    originalName: file.originalname,
    storedName: file.filename,
    path: file.path,
    sizeMb: (file.size / (1024 * 1024)).toFixed(3),
    uploadedAt: new Date().toISOString(),
  };

  logger.info(
    `[upload.service] File stored — fileId: ${fileId}, ` +
    `original: ${file.originalname}, size: ${record.sizeMb}MB`
  );

  return record;
};

/**
 * Full pipeline: store → extract → chunk.
 * Chunking is skipped (non-fatal) if extraction fails or yields no text.
 *
 * @param {Express.Multer.File} file
 * @returns {{ fileRecord, extraction, chunking }}
 */
const processUploadWithExtraction = async (file) => {
  // Stage 1: Build file record
  const fileRecord = await processUpload(file);

  // Stage 2: Extract text
  const extraction = await extractText(file.path, fileRecord.fileId);

  if (!extraction.success) {
    logger.warn(
      `[upload.service] Extraction failed for fileId ${fileRecord.fileId} ` +
      `(${extraction.errorCode}) — chunking skipped`
    );
    return { fileRecord, extraction, chunking: null };
  }

  // Stage 3: Chunk extracted text
  let chunking = null;
  try {
    chunking = await chunkText(fileRecord.fileId, extraction.text);
  } catch (err) {
    // Chunking failure must not break the upload response
    logger.error(
      `[upload.service] Chunking failed for fileId ${fileRecord.fileId}: ${err.message}`
    );
  }

  return { fileRecord, extraction, chunking };
};

const deleteFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`[upload.service] Cleaned up file: ${filePath}`);
    }
  } catch (err) {
    logger.error(`[upload.service] Failed to delete ${filePath}: ${err.message}`);
  }
};

module.exports = { processUpload, processUploadWithExtraction, deleteFile };