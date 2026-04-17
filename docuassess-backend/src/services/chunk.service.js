const {
  splitIntoParagraphs,
  buildChunks,
  getAverageChunkSize,
} = require('../utils/chunkHelpers');
const logger = require('../utils/logger');

const CHUNK_CONFIG = {
  maxWordsPerChunk: parseInt(process.env.CHUNK_MAX_WORDS, 10) || 700,
};

// 🔹 Keep temporarily (until DB fully replaces it)
const chunkStore = new Map();

const chunkText = async (fileId, cleanedText) => {
  if (!fileId || typeof fileId !== 'string') {
    throw new Error('chunkText: fileId is required and must be a string');
  }

  if (!cleanedText || typeof cleanedText !== 'string' || cleanedText.trim().length === 0) {
    logger.warn(`[chunk.service] Empty text for fileId: ${fileId} — skipping`);
    return { chunkCount: 0, averageWordCount: 0, chunks: [] };
  }

  const paragraphs = splitIntoParagraphs(cleanedText);

  if (paragraphs.length === 0) {
    logger.warn(`[chunk.service] No paragraphs for fileId: ${fileId}`);
    return { chunkCount: 0, averageWordCount: 0, chunks: [] };
  }

  const chunks = buildChunks(paragraphs, CHUNK_CONFIG.maxWordsPerChunk);

  if (chunks.length === 0) {
    logger.warn(`[chunk.service] No chunks produced for fileId: ${fileId}`);
    return { chunkCount: 0, averageWordCount: 0, chunks: [] };
  }

  const averageWordCount = getAverageChunkSize(chunks);

  // 🔹 TEMP: keep in-memory for now
  chunkStore.set(fileId, chunks);

  logger.info(
    `[chunk.service] Chunking complete — fileId: ${fileId}, ` +
    `chunks: ${chunks.length}, avgWords: ${averageWordCount}`
  );

  return {
    chunkCount: chunks.length,
    averageWordCount,
    chunks, // 🔥 IMPORTANT: return chunks for DB storage
  };
};

// 🔹 Keep until DB fully replaces usage
const getChunks = (fileId) => chunkStore.get(fileId) || null;

const deleteChunks = (fileId) => chunkStore.delete(fileId);

const getStoreSize = () => chunkStore.size;

module.exports = {
  chunkText,
  getChunks,
  deleteChunks,
  getStoreSize,
};