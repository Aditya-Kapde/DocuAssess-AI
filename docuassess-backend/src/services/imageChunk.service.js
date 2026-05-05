const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { analyzeImage } = require('./ai.service');

/**
 * Image chunk shape (returned per meaningful image):
 * {
 *   type: 'image',
 *   page: number,
 *   concepts: string[],
 *   description: string,
 *   labels: string[],
 *   path: string
 * }
 */

/**
 * Reads a PNG file from disk and returns its base64-encoded content.
 * Returns null if the file cannot be read (logs a warning, never throws).
 *
 * @param {string} imagePath - Absolute path to the image file
 * @returns {string | null}
 */
const _readAsBase64 = (imagePath) => {
  try {
    const resolved = path.resolve(imagePath);

    if (!fs.existsSync(resolved)) {
      logger.warn(`[imageChunk.service] Image file not found: ${resolved}`);
      return null;
    }

    const buffer = fs.readFileSync(resolved);
    return buffer.toString('base64');
  } catch (err) {
    logger.error(
      `[imageChunk.service] Failed to read image ${imagePath}: ${err.message}`
    );
    return null;
  }
};

/**
 * Processes an array of extracted images through Gemini Vision analysis
 * and returns structured image chunks for downstream use.
 *
 * Flow per image:
 *   1. Read PNG → base64
 *   2. Call analyzeImage() for Gemini Vision analysis
 *   3. Build a chunk object with the analysis results
 *   4. Filter out images with no meaningful concepts
 *
 * @param {Array<{ page: number, path: string }>} images
 *   Output from extractImagesFromPdf() — each entry has a page number
 *   and an absolute path to the extracted PNG.
 *
 * @returns {Promise<{
 *   chunkCount: number,
 *   skipped: number,
 *   failed: number,
 *   chunks: Array<{
 *     type: 'image',
 *     page: number,
 *     concepts: string[],
 *     description: string,
 *     labels: string[],
 *     path: string
 *   }>
 * }>}
 */
const createImageChunks = async (images) => {
  if (!Array.isArray(images) || images.length === 0) {
    logger.warn('[imageChunk.service] No images provided — skipping');
    return { chunkCount: 0, skipped: 0, failed: 0, chunks: [] };
  }

  logger.info(
    `[imageChunk.service] Processing ${images.length} image(s) for chunking`
  );

  const chunks = [];
  let skipped = 0;
  let failed = 0;

  for (const image of images) {
    const { page, path: imagePath } = image;

    // ── Step 1: Read image to base64 ─────────────────────────────────────
    const base64 = _readAsBase64(imagePath);

    if (!base64) {
      logger.warn(
        `[imageChunk.service] Skipping page ${page} — could not read image`
      );
      failed++;
      continue;
    }

    // ── Step 2: Analyse with Gemini Vision ───────────────────────────────
    let analysis;
    try {
      analysis = await analyzeImage(base64);
    } catch (err) {
      logger.error(
        `[imageChunk.service] analyzeImage threw for page ${page}: ${err.message}`
      );
      failed++;
      continue;
    }

    if (!analysis.success || !analysis.data) {
      logger.warn(
        `[imageChunk.service] Analysis failed for page ${page} ` +
        `(errorCode: ${analysis.errorCode}) — skipping`
      );
      failed++;
      continue;
    }

    const { data } = analysis;

    // ── Step 3: Build chunk ──────────────────────────────────────────────
    const concepts = Array.isArray(data.concepts) ? data.concepts : [];
    const description = typeof data.description === 'string' ? data.description : '';
    const labels = Array.isArray(data.labels) ? data.labels : [];

    // ── Step 4: Filter — only keep meaningful images ─────────────────────
    if (concepts.length === 0) {
      logger.debug(
        `[imageChunk.service] Page ${page} produced no concepts — skipping`
      );
      skipped++;
      continue;
    }

    chunks.push({
      type: 'image',
      page,
      concepts,
      description,
      labels,
      path: imagePath,
    });

    logger.debug(
      `[imageChunk.service] Chunk created for page ${page} — ` +
      `concepts: ${concepts.length}, labels: ${labels.length}`
    );
  }

  logger.info(
    `[imageChunk.service] Chunking complete — ` +
    `chunks: ${chunks.length}, skipped: ${skipped}, failed: ${failed}`
  );

  return {
    chunkCount: chunks.length,
    skipped,
    failed,
    chunks,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// Image relevance scoring
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimum relevance score (0–1) for an image to be considered a match.
 */
const MIN_RELEVANCE_SCORE = 0.15;

/**
 * Tokenizes a string into lowercase words for comparison.
 * Strips punctuation and splits on whitespace.
 *
 * @param {string} text
 * @returns {Set<string>}
 */
const _tokenize = (text) => {
  if (!text || typeof text !== 'string') return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2) // skip very short words (a, an, is, …)
  );
};

/**
 * Computes a relevance score (0–1) between a question and an image chunk.
 *
 * Uses concept overlap (weighted 2×) + description keyword overlap.
 * Score = matched terms / total image terms.
 *
 * @param {string} questionText - The question string
 * @param {{ concepts: string[], description: string, labels: string[] }} imageChunk
 * @returns {number} Score between 0 and 1
 */
const scoreImageRelevance = (questionText, imageChunk) => {
  if (!questionText || !imageChunk) return 0;

  const questionTokens = _tokenize(questionText);
  if (questionTokens.size === 0) return 0;

  // Build a weighted bag from image metadata
  const conceptTokens = (imageChunk.concepts || [])
    .flatMap((c) => [..._tokenize(c)]);
  const descTokens = [..._tokenize(imageChunk.description || '')];
  const labelTokens = (imageChunk.labels || [])
    .flatMap((l) => [..._tokenize(l)]);

  // Concepts are weighted 2× because they're the most semantically significant
  const imageTerms = [
    ...conceptTokens, ...conceptTokens, // doubled for weight
    ...descTokens,
    ...labelTokens,
  ];

  if (imageTerms.length === 0) return 0;

  const imageTermSet = new Set(imageTerms);
  let matchCount = 0;

  for (const token of questionTokens) {
    if (imageTermSet.has(token)) {
      matchCount++;
    }
  }

  return matchCount / questionTokens.size;
};

/**
 * Finds the best matching image chunk for a given question.
 * Returns the image chunk and its score, or null if no image
 * meets the minimum relevance threshold.
 *
 * @param {string} questionText
 * @param {Array<{ type: 'image', page: number, concepts: string[], description: string, labels: string[], path: string }>} imageChunks
 * @returns {{ chunk: object, score: number } | null}
 */
const findBestImageMatch = (questionText, imageChunks) => {
  if (!questionText || !Array.isArray(imageChunks) || imageChunks.length === 0) {
    return null;
  }

  let bestChunk = null;
  let bestScore = 0;

  for (const chunk of imageChunks) {
    const score = scoreImageRelevance(questionText, chunk);
    if (score > bestScore) {
      bestScore = score;
      bestChunk = chunk;
    }
  }

  if (bestScore < MIN_RELEVANCE_SCORE) {
    return null;
  }

  logger.debug(
    `[imageChunk.service] Best image match — page: ${bestChunk.page}, ` +
    `score: ${bestScore.toFixed(3)}`
  );

  return { chunk: bestChunk, score: bestScore };
};

// ═══════════════════════════════════════════════════════════════════════════════
// Visual concept detection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Keywords that indicate an image contains visual/spatial content
 * which MUST be shown alongside the question for it to make sense.
 */
const VISUAL_KEYWORDS = [
  'diagram', 'shape', 'geometry', 'graph', 'number line',
  'figure', 'composite', 'chart', 'plot', 'table', 'illustration',
  'flowchart', 'circuit', 'schematic', 'map', 'cross-section',
  'bar graph', 'pie chart', 'line graph', 'histogram',
];

/**
 * Checks whether an image chunk's concepts indicate visual content
 * that requires the image to be shown with the question.
 *
 * This is a deterministic, keyword-based check — it does NOT rely
 * on the AI to decide. If any concept matches a visual keyword,
 * the image MUST be attached.
 *
 * @param {string[]} concepts - The concepts array from an image chunk
 * @returns {boolean}
 */
const isVisualConcept = (concepts) => {
  if (!Array.isArray(concepts) || concepts.length === 0) return false;

  const joined = concepts.join(' ').toLowerCase();

  return VISUAL_KEYWORDS.some((keyword) => joined.includes(keyword));
};

module.exports = {
  createImageChunks,
  scoreImageRelevance,
  findBestImageMatch,
  isVisualConcept,
};
