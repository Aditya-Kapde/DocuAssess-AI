const { getChunks } = require('./chunk.service');
const logger = require('../utils/logger');

const DEFAULT_TOP_K = parseInt(process.env.RAG_TOP_K, 10) || 10;

/**
 * Retrieves the top K chunks for a given fileId.
 * Returns chunk content strings ready for prompt assembly.
 *
 * @param {string} fileId
 * @param {number} [topK]
 * @returns {{ contents: string[], totalChunks: number }}
 */
const retrieveContext = (fileId, topK = DEFAULT_TOP_K) => {
  const chunks = getChunks(fileId);

  if (!chunks || chunks.length === 0) {
    const err = new Error(`No chunks found for fileId: ${fileId}`);
    err.status = 404;
    err.errorCode = 'CHUNKS_NOT_FOUND';
    throw err;
  }

  // Slice to topK — future: rank by similarity score before slicing
  const selected = chunks.slice(0, topK);
  const contents = selected.map((c) => c.content);

  logger.info(
    `[rag.service] Retrieved ${contents.length}/${chunks.length} chunks for fileId: ${fileId}`
  );

  return { contents, totalChunks: chunks.length };
};

module.exports = { retrieveContext };