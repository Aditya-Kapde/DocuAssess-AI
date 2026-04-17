const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { extractText } = require('./pdf.service');
const { chunkText } = require('./chunk.service');
const FileRecord = require('../models/fileRecord.model');

/**
 * Stage 1 — Store file metadata in DB immediately after multer writes to disk.
 * Status is 'uploaded' until extraction + chunking complete.
 */
const processUpload = async (file) => {
  const fileId = path.basename(file.filename, '.pdf');

  const record = await FileRecord.create({
    fileId,
    originalName: file.originalname,
    storedName:   file.filename,
    filePath:     file.path,
    sizeMb:       parseFloat((file.size / (1024 * 1024)).toFixed(3)),
    uploadedAt:   new Date(),
    status:       'uploaded',
  });

  logger.info(
    `[upload.service] FileRecord created — fileId: ${fileId}, ` +
    `original: ${file.originalname}, size: ${record.sizeMb}MB`
  );

  return record;
};

/**
 * Full pipeline — store → extract → chunk → persist results.
 * Each stage failure is caught, record is marked 'failed', error is re-thrown
 * so the controller can return the correct HTTP response.
 */
const processUploadWithExtraction = async (file) => {
  // ── Stage 1: Create DB record ─────────────────────────────────────────────
  let fileRecord;
  try {
    fileRecord = await processUpload(file);
  } catch (err) {
    logger.error(`[upload.service] Failed to create FileRecord: ${err.message}`);
    throw err;
  }

  const { fileId } = fileRecord;

  // ── Stage 2: Extract text ─────────────────────────────────────────────────
  let extraction;
  try {
    extraction = await extractText(file.path, fileId);
  } catch (err) {
    await _markFailed(fileId, err.message);
    throw err;
  }

  if (!extraction.success) {
    await _markFailed(fileId, extraction.warning || extraction.errorCode);
    return { fileRecord, extraction, chunking: null };
  }

  // ── Stage 3: Chunk text ───────────────────────────────────────────────────
  let chunking = null;
  try {
    chunking = await chunkText(fileId, extraction.text);
  } catch (err) {
    logger.error(`[upload.service] Chunking failed for fileId ${fileId}: ${err.message}`);
    await _markFailed(fileId, err.message);
    return { fileRecord, extraction, chunking: null };
  }

  // ── Stage 4: Persist extraction + chunk results ───────────────────────────
  try {
    await FileRecord.findOneAndUpdate(
      { fileId },
      {
        $set: {
          pageCount:  extraction.pageCount,
          charCount:  extraction.charCount,
          chunks:     chunking.chunks,
          chunkCount: chunking.chunkCount,
          status:     'processed',
          error:      null,
        },
      },
      { new: true }
    );

    logger.info(
      `[upload.service] FileRecord updated to 'processed' — fileId: ${fileId}, ` +
      `chunks: ${chunking.chunkCount}`
    );
  } catch (err) {
    logger.error(`[upload.service] Failed to persist results for ${fileId}: ${err.message}`);
    await _markFailed(fileId, err.message);
    throw err;
  }

  return { fileRecord, extraction, chunking };
};

/**
 * Updates a FileRecord to 'failed' status with an error message.
 * Never throws — failure to mark-failed should not mask the original error.
 */
const _markFailed = async (fileId, errorMessage) => {
  try {
    await FileRecord.findOneAndUpdate(
      { fileId },
      { $set: { status: 'failed', error: errorMessage } }
    );
    logger.warn(`[upload.service] FileRecord marked 'failed' — fileId: ${fileId}`);
  } catch (err) {
    logger.error(`[upload.service] Could not mark record failed for ${fileId}: ${err.message}`);
  }
};

/**
 * Deletes a file from disk. Used for cleanup on controller-level failure.
 */
const deleteFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`[upload.service] File deleted: ${filePath}`);
    }
  } catch (err) {
    logger.error(`[upload.service] Failed to delete ${filePath}: ${err.message}`);
  }
};

module.exports = { processUpload, processUploadWithExtraction, deleteFile };