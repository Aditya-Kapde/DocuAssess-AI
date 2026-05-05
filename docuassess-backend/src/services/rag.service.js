const FileRecord = require('../models/fileRecord.model');
const { createImageChunks } = require('./imageChunk.service');
const logger = require('../utils/logger');

const DEFAULT_TOP_K = parseInt(process.env.RAG_TOP_K, 10) || 10;

/**
 * Fetches text chunks and image chunks for a fileId from MongoDB.
 * Returns content strings ready for prompt assembly, plus structured
 * image chunks for multimodal consumers.
 *
 * **Backward compatible** — existing consumers that destructure only
 * `{ contents, totalChunks }` continue to work unchanged.
 *
 * @param {string} fileId
 * @param {number} [topK]
 * @returns {{
 *   contents: string[],
 *   totalChunks: number,
 *   imageChunks: Array<{
 *     type: 'image',
 *     page: number,
 *     concepts: string[],
 *     description: string,
 *     labels: string[],
 *     path: string
 *   }>
 * }}
 */
const retrieveContext = async (fileId, topK = DEFAULT_TOP_K) => {
  let record;
  try {
    // Project only what we need — avoid pulling full document
    // Include images alongside chunks for multimodal retrieval
    record = await FileRecord.findOne(
      { fileId },
      { chunks: 1, images: 1, status: 1, error: 1 }
    ).lean();
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

  // ── Text chunks (existing logic — unchanged) ────────────────────────────
  const selected = record.chunks.slice(0, topK);
  const contents = selected.map((c) => c.content);

  logger.info(
    `[rag.service] Retrieved ${contents.length}/${record.chunks.length} text chunks ` +
    `for fileId: ${fileId}`
  );

  // ── Image chunks ────────────────────────────────────────────────────────
  // If images have pre-analyzed metadata (concepts), use fast-path.
  // Otherwise, run full analysis via createImageChunks (Gemini Vision).
  let imageChunks = [];

  if (Array.isArray(record.images) && record.images.length > 0) {
    const hasMetadata = record.images.some(
      (img) => Array.isArray(img.metadata?.concepts) && img.metadata.concepts.length > 0
    );

    if (hasMetadata) {
      // Fast path — metadata already exists in DB
      imageChunks = _buildImageChunks(record.images);
      logger.info(
        `[rag.service] Built ${imageChunks.length} image chunk(s) from DB metadata ` +
        `for fileId: ${fileId}`
      );
    } else {
      // Slow path — run Gemini Vision analysis on extracted images
      logger.info(
        `[rag.service] No image metadata in DB — running createImageChunks ` +
        `for ${record.images.length} image(s), fileId: ${fileId}`
      );

      try {
        const analysisResult = await createImageChunks(record.images);
        imageChunks = analysisResult.chunks;

        logger.info(
          `[rag.service] createImageChunks returned ${imageChunks.length} chunk(s) ` +
          `(skipped: ${analysisResult.skipped}, failed: ${analysisResult.failed}) ` +
          `for fileId: ${fileId}`
        );

        // Persist analysis results back to DB so we don't re-analyze next time
        if (imageChunks.length > 0) {
          try {
            const updatedImages = record.images.map((img) => {
              const analyzed = imageChunks.find((c) => c.page === img.page);
              if (analyzed) {
                return {
                  ...img,
                  metadata: {
                    type: 'image',
                    concepts: analyzed.concepts,
                    description: analyzed.description,
                  },
                };
              }
              return img;
            });

            await FileRecord.updateOne(
              { fileId },
              { $set: { images: updatedImages } }
            );

            logger.info(
              `[rag.service] Persisted image analysis metadata to DB for fileId: ${fileId}`
            );
          } catch (persistErr) {
            // Non-fatal — analysis still works for this request
            logger.warn(
              `[rag.service] Failed to persist image metadata for ${fileId}: ${persistErr.message}`
            );
          }
        }
      } catch (err) {
        // Non-fatal — text-only pipeline continues
        logger.warn(
          `[rag.service] createImageChunks failed for fileId ${fileId} (non-fatal): ${err.message}`
        );
      }
    }
  }

  logger.info(
    `[rag.service] Context ready — text: ${contents.length}, images: ${imageChunks.length}, ` +
    `fileId: ${fileId}`
  );

  return { contents, totalChunks: record.chunks.length, imageChunks };
};

/**
 * Transforms raw image subdocuments from the DB into structured image chunks.
 * Filters out entries that have no meaningful metadata (no concepts).
 * Returns an empty array if the images field is missing or empty — never throws.
 *
 * @param {Array} [images] - Raw images array from FileRecord
 * @returns {Array<{
 *   type: 'image',
 *   page: number,
 *   concepts: string[],
 *   description: string,
 *   labels: string[],
 *   path: string
 * }>}
 */
const _buildImageChunks = (images) => {
  if (!Array.isArray(images) || images.length === 0) {
    return [];
  }

  return images.map((img) => ({
    type: 'image',
    page: img.page,
    concepts: img.metadata?.concepts || [],
    description: img.metadata?.description || '',
    labels: [],
    path: img.path,
  }));
};

module.exports = { retrieveContext };