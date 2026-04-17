const FileRecord = require('../models/fileRecord.model');
const logger = require('../utils/logger');

const DEFAULT_TOP_K = parseInt(process.env.RAG_TOP_K, 10) || 10;

/**
 * Fetches chunks for a fileId from MongoDB.
 * Returns content strings ready for prompt assembly.
 *
 * @param {string} fileId
 * @param {number} [topK]
 * @returns {{ contents: string[], totalChunks: number }}
 */
const retrieveContext = async (fileId, topK = DEFAULT_TOP_K) => {
  let record;
  try {
    // Project only what we need — avoid pulling full document
    record = await FileRecord.findOne({ fileId }, { chunks: 1, status: 1, error: 1 }).lean();
  } catch (err) {
    logger.error(`[rag.service] DB query failed for fileId ${fileId}: ${err.message}`);
    const dbErr = new Error('Database error while retrieving context');
    dbErr.status = 500;
    dbErr.errorCode = 'DB_ERROR';
    throw dbErr;
  }

  if (!record) {
    const err = new Error(`No file record found for fileId: ${fileId}`);
    err.status = 404;
    err.errorCode = 'FILE_NOT_FOUND';
    throw err;
  }

  if (record.status !== 'processed') {
    const err = new Error(
      `File ${fileId} is not ready for generation (status: ${record.status})`
    );
    err.status = 422;
    err.errorCode = 'FILE_NOT_PROCESSED';
    throw err;
  }

  if (!record.chunks || record.chunks.length === 0) {
    const err = new Error(`No chunks found for fileId: ${fileId}`);
    err.status = 404;
    err.errorCode = 'CHUNKS_NOT_FOUND';
    throw err;
  }

  const selected = record.chunks.slice(0, topK);
  const contents = selected.map((c) => c.content);

  logger.info(
    `[rag.service] Retrieved ${contents.length}/${record.chunks.length} chunks ` +
    `for fileId: ${fileId}`
  );

  return { contents, totalChunks: record.chunks.length };
};

module.exports = { retrieveContext };