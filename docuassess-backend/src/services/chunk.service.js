const {
  splitIntoParagraphs,
  buildChunks,
  getAverageChunkSize,
} = require('../utils/chunkHelpers');
const logger = require('../utils/logger');

/**
 * Configuration — externalize to env if tuning is needed per deployment.
 * 500–800 words balances context richness vs. prompt token budget.
 */
const CHUNK_CONFIG = {
  maxWordsPerChunk: parseInt(process.env.CHUNK_MAX_WORDS, 10) || 700,
};

/**
 * In-memory chunk store: { [fileId]: Chunk[] }
 * Interim storage — interface is stable for future DB/vector store swap.
 */
const chunkStore = new Map();

/**
 * Splits extracted text into paragraph-aware chunks and stores them.
 *
 * @param {string} fileId - Correlates chunks to an uploaded file
 * @param {string} cleanedText - Output from pdf.service / textCleaner
 * @returns {{
 *   chunkCount: number,
 *   averageWordCount: number,
 *   chunks: { chunkId: string, index: number, content: string, wordCount: number }[]
 * }}
 */
const chunkText = async (fileId, cleanedText) => {
  if (!fileId || typeof fileId !== 'string') {
    throw new Error('chunkText: fileId is required and must be a string');
  }

  if (!cleanedText || typeof cleanedText !== 'string' || cleanedText.trim().length === 0) {
    logger.warn(`[chunk.service] Empty text received for fileId: ${fileId} — skipping chunking`);
    return { chunkCount: 0, averageWordCount: 0, chunks: [] };
  }

  const paragraphs = splitIntoParagraphs(cleanedText);

  if (paragraphs.length === 0) {
    logger.warn(`[chunk.service] No paragraphs found after splitting for fileId: ${fileId}`);
    return { chunkCount: 0, averageWordCount: 0, chunks: [] };
  }

  const chunks = buildChunks(paragraphs, CHUNK_CONFIG.maxWordsPerChunk);

  if (chunks.length === 0) {
    logger.warn(`[chunk.service] Chunk builder produced 0 chunks for fileId: ${fileId}`);
    return { chunkCount: 0, averageWordCount: 0, chunks: [] };
  }

  const averageWordCount = getAverageChunkSize(chunks);

  // Persist to in-memory store
  chunkStore.set(fileId, chunks);

  logger.info(
    `[chunk.service] Chunking complete — fileId: ${fileId}, ` +
    `chunks: ${chunks.length}, avgWords: ${averageWordCount}, ` +
    `maxWordsPerChunk: ${CHUNK_CONFIG.maxWordsPerChunk}`
  );

  return { chunkCount: chunks.length, averageWordCount, chunks };
};

/**
 * Retrieves stored chunks for a fileId.
 * @param {string} fileId
 * @returns {Chunk[] | null} null if not found
 */
const getChunks = (fileId) => {
  if (!chunkStore.has(fileId)) {
    logger.warn(`[chunk.service] No chunks found for fileId: ${fileId}`);
    return null;
  }
  return chunkStore.get(fileId);
};

/**
 * Removes chunks from store. Call on file deletion or session cleanup.
 * @param {string} fileId
 */
const deleteChunks = (fileId) => {
  if (chunkStore.has(fileId)) {
    chunkStore.delete(fileId);
    logger.info(`[chunk.service] Chunks cleared for fileId: ${fileId}`);
  }
};

/**
 * Returns current chunk store size. Useful for monitoring/health checks.
 * @returns {number}
 */
const getStoreSize = () => chunkStore.size;

module.exports = { chunkText, getChunks, deleteChunks, getStoreSize };