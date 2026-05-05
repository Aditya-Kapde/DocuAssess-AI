const { retrieveContext } = require('./rag.service');
const { buildPrompt, buildImagePrompt, isImageBasedType, cleanVisualReferences } = require('../utils/promptBuilder');
const { generateFromPrompt } = require('./ai.service');
const { validateAndNormalize } = require('../utils/outputNormalizer');
const { normalizeAiOutputKeys, normalizeAiOutputStructure } = require('../utils/typeMapping');
const { normalizeForValidation } = require('../utils/preValidation');
const { findBestImageMatch, isVisualConcept } = require('./imageChunk.service');
const logger = require('../utils/logger');

/**
 * Maximum retry attempts when AI returns fewer questions than requested.
 */
const MAX_RETRIES = 3;

/**
 * Generates questions for a SINGLE question type with retry-on-shortage logic.
 *
 * - Calls AI independently for this type
 * - Normalizes AI output keys (handles Gemini returning variant key names)
 * - Validates response via existing normalizer
 * - If fewer valid questions than requested → retries (up to MAX_RETRIES total)
 * - If more valid questions than requested → trims
 *
 * @param {object} params
 * @param {string[]} params.chunkContents - Pre-fetched chunk text (shared across types)
 * @param {string} params.type - e.g. 'mcq', 'true_false'
 * @param {number} params.count - Exact number of questions to generate
 * @returns {{ type: string, questions: object[], meta: object }}
 */
const generatePerType = async ({ chunkContents, type, count }) => {
  let accumulated = [];
  let attempts = 0;
  let lastAiRetried = false;

  logger.info(
    `[generatePerType] ── Starting generation for type: "${type}", requested count: ${count} ──`
  );

  while (accumulated.length < count && attempts < MAX_RETRIES) {
    attempts++;
    const remaining = count - accumulated.length;

    logger.info(
      `[generatePerType] "${type}" attempt ${attempts}/${MAX_RETRIES} — ` +
      `requesting ${remaining} question(s), accumulated so far: ${accumulated.length}`
    );

    // ── Build single-type prompt ───────────────────────────────────────────
    const { prompt, usedChunks, truncated } = buildPrompt({
      chunkContents,
      questionSpec: [{ type, count: remaining }],
    });

    logger.debug(
      `[generatePerType] "${type}" prompt built — usedChunks: ${usedChunks}, truncated: ${truncated}`
    );

    // ── Call AI ─────────────────────────────────────────────────────────────
    const aiResult = await generateFromPrompt(prompt);
    lastAiRetried = aiResult.retried;

    if (!aiResult.success) {
      logger.error(
        `[generatePerType] AI call failed for "${type}" on attempt ${attempts}: ${aiResult.errorCode}`
      );
      // If first attempt fails with nothing, propagate error.
      // Otherwise return what we have.
      if (accumulated.length === 0) {
        return {
          type,
          questions: [],
          meta: {
            requested: count,
            returned: 0,
            attempts,
            retried: lastAiRetried,
            usedChunks,
            truncated,
          },
          errorCode: aiResult.errorCode,
          error: aiResult.error,
        };
      }
      break; // Return whatever we accumulated so far
    }

    // ── Debug: Log raw AI output ────────────────────────────────────────────
    const rawData = aiResult.data;
    logger.debug(
      `[generatePerType] "${type}" raw AI output — typeof: ${typeof rawData}, ` +
      `isArray: ${Array.isArray(rawData)}, ` +
      `keys: [${rawData && typeof rawData === 'object' && !Array.isArray(rawData) ? Object.keys(rawData).join(', ') : 'N/A'}]`
    );

    if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
      for (const key of Object.keys(rawData)) {
        const val = rawData[key];
        const arrLen = Array.isArray(val) ? val.length : 'NOT_ARRAY';
        logger.debug(
          `[generatePerType] "${type}" raw key "${key}" → ${arrLen} items`
        );
      }
    }

    // ── Step 1: Normalize AI output STRUCTURE ──────────────────────────────
    // Handles: flat arrays, { questions: [...] } wrappers, string JSON,
    // single-key objects with wrong key names, etc.
    const structuredData = normalizeAiOutputStructure(rawData, type);
    const structuredKeys = Object.keys(structuredData);
    logger.debug(
      `[generatePerType] "${type}" after structure normalization — keys: [${structuredKeys.join(', ')}]`
    );

    // ── Step 2: Normalize AI output KEYS ───────────────────────────────────
    // Handles: camelCase, alternative snake_case, semantic synonyms
    const normalizedData = normalizeAiOutputKeys(structuredData);
    const normalizedKeys = Object.keys(normalizedData);
    logger.debug(
      `[generatePerType] "${type}" after key normalization — keys: [${normalizedKeys.join(', ')}]`
    );

    // Check if the expected type key exists after both normalization steps
    if (!normalizedData[type]) {
      logger.warn(
        `[generatePerType] "${type}" key NOT found after normalization! ` +
        `Available keys: [${normalizedKeys.join(', ')}]. ` +
        `Raw data type: ${typeof rawData}, isArray: ${Array.isArray(rawData)}`
      );
    } else {
      const typeArr = normalizedData[type];
      logger.debug(
        `[generatePerType] "${type}" found ${Array.isArray(typeArr) ? typeArr.length : 'NON-ARRAY'} items under "${type}" key`
      );
    }

    // ── Step 3: Pre-validation normalization ────────────────────────────────
    // Fixes minor AI formatting issues: string booleans, blank markers,
    // casing/whitespace mismatches in options vs answers, etc.
    const preValidatedData = normalizeForValidation(normalizedData, type);

    const preValCount = Array.isArray(preValidatedData?.[type])
      ? preValidatedData[type].length
      : 0;
    logger.info(
      `[generatePerType] "${type}": ${preValCount} items BEFORE validation`
    );

    // ── Step 4: Validate + normalize ───────────────────────────────────────
    const { validatedQuestions, validationMeta } = validateAndNormalize(
      preValidatedData,
      [{ type, count: remaining }]
    );

    const valid = validatedQuestions[type] || [];

    logger.info(
      `[generatePerType] "${type}": ${valid.length} items AFTER validation ` +
      `(${preValCount - valid.length} rejected)`
    );

    // Log first 5 rejection reasons for debugging
    if (validationMeta?.perType?.[type]?.issues?.length > 0) {
      const issues = validationMeta.perType[type].issues;
      const shown = issues.slice(0, 5);
      shown.forEach((issue) => {
        logger.debug(`[generatePerType] "${type}" rejection: ${issue}`);
      });
      if (issues.length > 5) {
        logger.debug(
          `[generatePerType] "${type}": ...and ${issues.length - 5} more rejection(s)`
        );
      }
    }

    accumulated.push(...valid);

    if (accumulated.length >= count) break; // Got enough

    logger.warn(
      `[generatePerType] "${type}": attempt ${attempts} yielded ` +
      `${valid.length}/${remaining} — ${accumulated.length}/${count} accumulated, retrying...`
    );
  }

  // ── Trim if over ─────────────────────────────────────────────────────────
  if (accumulated.length > count) {
    logger.debug(`[generatePerType] "${type}": trimming ${accumulated.length} → ${count}`);
    accumulated = accumulated.slice(0, count);
  }

  const shortage = count - accumulated.length;
  if (shortage > 0) {
    logger.warn(
      `[generatePerType] "${type}": exhausted ${MAX_RETRIES} attempts — ` +
      `returning ${accumulated.length}/${count} (shortage: ${shortage})`
    );
  } else {
    logger.info(
      `[generatePerType] "${type}": ✓ successfully generated ${accumulated.length}/${count} questions in ${attempts} attempt(s)`
    );
  }

  return {
    type,
    questions: accumulated,
    meta: {
      requested: count,
      returned: accumulated.length,
      shortage,
      attempts,
      retried: lastAiRetried,
    },
    errorCode: null,
    error: null,
  };
};

/**
 * Full generation pipeline (refactored for per-type counts):
 *
 * 1. Filter out zero-count types from questionConfig
 * 2. Retrieve context chunks ONCE (shared across all types)
 * 3. Generate each type independently via generatePerType()
 * 4. Merge all questions into a flat array
 * 5. Assign globally unique IDs after merge
 *
 * @param {object} params
 * @param {string} params.fileId
 * @param {Record<string, number>} params.questionConfig - e.g. { mcq: 5, true_false: 3 }
 */
const generateQuestions = async ({ fileId, questionConfig }) => {
  // ── Filter out zero-count types ──────────────────────────────────────────
  const effectiveConfig = Object.fromEntries(
    Object.entries(questionConfig).filter(([, count]) => count > 0)
  );

  const effectiveTypes = Object.keys(effectiveConfig);

  logger.info(
    `[generate.service] ═══ Starting generation pipeline for fileId: ${fileId} ═══`
  );
  logger.info(
    `[generate.service] Input questionConfig: ${JSON.stringify(questionConfig)}`
  );
  logger.info(
    `[generate.service] Effective config (after filtering zeros): ${JSON.stringify(effectiveConfig)}`
  );

  // ── Safety: all types have zero count ────────────────────────────────────
  if (effectiveTypes.length === 0) {
    logger.warn('[generate.service] All question types have zero count');
    return {
      success: false,
      questions: null,
      meta: {
        retried: false,
        usedChunks: 0,
        totalChunks: 0,
        truncated: false,
        validation: null,
      },
      errorCode: 'NO_VALID_TYPES',
      error: 'No valid question types selected',
    };
  }

  // ── Stage 1: Retrieve context (text chunks + image chunks) ───────────────
  const { contents, totalChunks, imageChunks } = await retrieveContext(fileId);
  logger.debug(`[generate.service] Image chunks available: ${imageChunks.length}`);

  if (!contents || contents.length === 0) {
    return {
      success: false,
      questions: null,
      meta: {
        retried: false,
        usedChunks: 0,
        totalChunks: 0,
        truncated: false,
        validation: null,
      },
      errorCode: 'CHUNKS_NOT_FOUND',
      error: `No chunks found for fileId: ${fileId}`,
    };
  }

  logger.info(
    `[generate.service] Retrieved ${contents.length}/${totalChunks} text chunks, ` +
    `${imageChunks.length} image chunk(s) for context`
  );

  // ── Split config into text-based and image-based types ───────────────────
  const textConfig = {};
  const imageConfig = {};

  for (const [type, count] of Object.entries(effectiveConfig)) {
    if (isImageBasedType(type)) {
      imageConfig[type] = count;
    } else {
      textConfig[type] = count;
    }
  }

  // ── Stage 2a: Generate text-based types (existing logic — unchanged) ─────
  const allQuestions = [];
  const perTypeMeta = {};
  let anyAiError = null;

  for (const [type, count] of Object.entries(textConfig)) {
    logger.info(
      `[generate.service] ── Processing text type: "${type}" (count: ${count}) ──`
    );

    const result = await generatePerType({
      chunkContents: contents,
      type,
      count,
    });

    // If this type had a fatal AI error and returned 0 questions, record it
    if (result.errorCode && result.questions.length === 0) {
      anyAiError = { errorCode: result.errorCode, error: result.error };
      logger.error(
        `[generate.service] Type "${type}" failed entirely: ${result.errorCode}`
      );
    }

    // Tag each question with its type and add to merged array
    result.questions.forEach((q) => allQuestions.push({ ...q, type }));
    perTypeMeta[type] = result.meta;

    logger.info(
      `[generate.service] Type "${type}": returned ${result.questions.length}/${count} questions`
    );
  }

  // ── Stage 2b: Generate image-based types (conditional) ───────────────────
  if (Object.keys(imageConfig).length > 0) {
    if (!imageChunks || imageChunks.length === 0) {
      logger.warn(
        `[generate.service] Image-based types requested but no image chunks available — skipping`
      );
      for (const [type, count] of Object.entries(imageConfig)) {
        perTypeMeta[type] = {
          requested: count,
          returned: 0,
          shortage: count,
          attempts: 0,
          retried: false,
          skippedReason: 'NO_IMAGE_CHUNKS',
        };
      }
    } else {
      for (const [type, count] of Object.entries(imageConfig)) {
        logger.info(
          `[generate.service] ── Processing image type: "${type}" (count: ${count}) ──`
        );

        const result = await generatePerImageType({
          imageChunks,
          type,
          count,
        });

        if (result.errorCode && result.questions.length === 0) {
          anyAiError = { errorCode: result.errorCode, error: result.error };
          logger.error(
            `[generate.service] Image type "${type}" failed entirely: ${result.errorCode}`
          );
        }

        result.questions.forEach((q) => allQuestions.push({ ...q, type }));
        perTypeMeta[type] = result.meta;

        logger.info(
          `[generate.service] Image type "${type}": returned ${result.questions.length}/${count} questions`
        );
      }
    }
  }

  // If no questions were generated at all and there was an AI error, propagate it
  if (allQuestions.length === 0 && anyAiError) {
    logger.error(
      `[generate.service] No questions generated across all types — propagating error`
    );
    return {
      success: false,
      questions: null,
      meta: {
        retried: true,
        usedChunks: contents.length,
        totalChunks,
        truncated: false,
        validation: perTypeMeta,
      },
      errorCode: anyAiError.errorCode,
      error: anyAiError.error,
    };
  }

  // ── Stage 3: Assign globally unique IDs AFTER merging ────────────────────
  allQuestions.forEach((q, i) => {
    q.id = `q-${i + 1}`;
  });

  // ── Stage 3.5: Intelligent image attachment ───────────────────────────────
  // Attaches images ONLY when the question text is relevant to the image.
  // No blind fallback — avoids misleading or unrelated images.
  if (imageChunks && imageChunks.length > 0) {
    let attachedCount = 0;

    /**
     * Detects visual intent in question text via keyword matching.
     * Used as a secondary signal alongside relevance score.
     */
    const hasVisualIntent = (text) => {
      if (!text) return false;
      const keywords = [
        'diagram', 'figure', 'graph', 'chart', 'plot',
        'number line', 'shape', 'illustration', 'shown',
        'image', 'picture', 'table', 'map', 'label',
        'flowchart', 'circuit', 'schematic', 'cross-section',
      ];
      const lower = text.toLowerCase();
      return keywords.some((k) => lower.includes(k));
    };

    /**
     * Normalizes an absolute/Windows path to a relative URL path.
     */
    const normalizePath = (rawPath) => {
      let p = (rawPath || '').replace(/\\/g, '/');
      const idx = p.indexOf('uploads/');
      return idx !== -1 ? p.substring(idx) : p;
    };

    for (const question of allQuestions) {
      // Step 1: Normalize question to { text, image } structure
      if (!question.question || typeof question.question === 'string') {
        question.question = {
          text: question.question || '',
          image: '',
        };
      } else if (typeof question.question === 'object') {
        if (!question.question.text) question.question.text = '';
        if (!question.question.image) question.question.image = '';
      }

      // Step 2: Read text safely
      const questionText = question.question.text;
      if (!questionText) continue; // skip empty questions

      // Step 3: Find best matching image across ALL image chunks
      const match = findBestImageMatch(questionText, imageChunks);

      // Step 4: Determine if attachment is warranted
      const visualIntent = hasVisualIntent(questionText);
      const scoreThreshold = 0.2;
      const shouldAttach = match && (match.score > scoreThreshold || visualIntent);

      if (shouldAttach) {
        const imgPath = normalizePath(match.chunk.path);

        question.question.image = imgPath;
        question.useImage = true;

        // Prepend diagram reference if not already present
        if (
          !questionText.toLowerCase().includes('refer to') &&
          !questionText.toLowerCase().includes('diagram shown')
        ) {
          question.question.text = `Refer to the diagram shown. ${questionText}`;
        }

        attachedCount++;
        logger.debug(
          `[generate.service] Attached image (page ${match.chunk.page}, ` +
          `score: ${match.score.toFixed(3)}, visualIntent: ${visualIntent}) ` +
          `→ "${imgPath}" to question "${question.id}"`
        );
      } else {
        // No relevant image — ensure fields are clean
        question.useImage = false;
        question.question.image = '';

        if (match) {
          logger.debug(
            `[generate.service] Skipped image for "${question.id}" — ` +
            `score ${match.score.toFixed(3)} below threshold and no visual intent`
          );
        }
      }
    }

    logger.info(
      `[generate.service] Intelligent image attachment: ${attachedCount}/${allQuestions.length} question(s) matched`
    );
  }
  // ── Stage 4: Normalize question structure + clean visual references ──────
  // Ensures every question.question is { text, image } — even when no images exist.
  // Also strips residual diagram/figure phrases from text-only questions.
  allQuestions.forEach((q) => {
    if (!q.question || typeof q.question === 'string') {
      q.question = { text: q.question || '', image: '' };
    } else if (typeof q.question === 'object') {
      if (!q.question.text) q.question.text = '';
      if (q.question.image === undefined || q.question.image === null) {
        q.question.image = '';
      }
    }

    // Post-processing: strip visual references from questions WITHOUT images
    if (!q.question.image) {
      const cleaned = cleanVisualReferences(q.question.text);
      if (cleaned !== q.question.text) {
        logger.debug(
          `[generate.service] Cleaned visual ref from "${q.id}": "${q.question.text.substring(0, 60)}..." → "${cleaned.substring(0, 60)}..."`
        );
        q.question.text = cleaned;
      }
    }
  });


  if (!Array.isArray(allQuestions)) {
    logger.error(
      `[generate.service] CRITICAL: allQuestions is not an array! type=${typeof allQuestions}, value=${JSON.stringify(allQuestions)}`
    );
    allQuestions = [];
  }

  // ── Debug: Log final output sample ───────────────────────────────────────
  if (allQuestions.length > 0) {
    logger.debug(
      `[generate.service] FINAL QUESTIONS SAMPLE: ${JSON.stringify(allQuestions[0], null, 2)}`
    );
  }

  logger.info(
    `[generate.service] ═══ Pipeline complete for fileId: ${fileId} ═══\n` +
    `  Total questions: ${allQuestions.length}\n` +
    `  Per-type: ${Object.entries(perTypeMeta).map(([t, m]) => `${t}: ${m.returned}/${m.requested}`).join(', ')}`
  );

  return {
    success: true,
    questions: allQuestions,
    meta: {
      usedChunks: contents.length,
      totalChunks,
      perType: perTypeMeta,
    },
    errorCode: null,
    error: null,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// Image-based question generation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates questions for a SINGLE image-based type with retry-on-shortage logic.
 *
 * Uses image chunk metadata (concepts, descriptions, labels) as context
 * instead of text chunks. Reuses the same normalization + validation pipeline
 * as text-based generation.
 *
 * @param {object} params
 * @param {Array<{ type: 'image', page: number, concepts: string[], description: string, labels: string[] }>} params.imageChunks
 * @param {string} params.type - e.g. 'diagram_mcq', 'graph_analysis', 'label_identification'
 * @param {number} params.count - Exact number of questions to generate
 * @returns {{ type: string, questions: object[], meta: object }}
 */
const generatePerImageType = async ({ imageChunks, type, count }) => {
  let accumulated = [];
  let attempts = 0;
  let lastAiRetried = false;

  logger.info(
    `[generatePerImageType] ── Starting generation for image type: "${type}", requested count: ${count} ──`
  );

  while (accumulated.length < count && attempts < MAX_RETRIES) {
    attempts++;
    const remaining = count - accumulated.length;

    logger.info(
      `[generatePerImageType] "${type}" attempt ${attempts}/${MAX_RETRIES} — ` +
      `requesting ${remaining} question(s), accumulated so far: ${accumulated.length}`
    );

    // ── Detect if visual concepts exist → pass forceImage to prompt ──────────
    const hasVisualContent = imageChunks.some((ic) => isVisualConcept(ic.concepts));

    // ── Build image-based prompt ─────────────────────────────────────────────
    const { prompt, usedChunks } = buildImagePrompt({
      imageChunks,
      questionSpec: [{ type, count: remaining }],
      forceImage: hasVisualContent,
    });

    logger.debug(
      `[generatePerImageType] "${type}" image prompt built — usedChunks: ${usedChunks}`
    );

    // ── Call AI ──────────────────────────────────────────────────────────────
    const aiResult = await generateFromPrompt(prompt);
    lastAiRetried = aiResult.retried;

    if (!aiResult.success) {
      logger.error(
        `[generatePerImageType] AI call failed for "${type}" on attempt ${attempts}: ${aiResult.errorCode}`
      );
      if (accumulated.length === 0) {
        return {
          type,
          questions: [],
          meta: {
            requested: count,
            returned: 0,
            attempts,
            retried: lastAiRetried,
            usedChunks,
          },
          errorCode: aiResult.errorCode,
          error: aiResult.error,
        };
      }
      break;
    }

    // ── Reuse same normalization pipeline as text-based generation ───────────
    const rawData = aiResult.data;

    logger.debug(
      `[generatePerImageType] "${type}" raw AI output — typeof: ${typeof rawData}, ` +
      `isArray: ${Array.isArray(rawData)}`
    );

    const structuredData = normalizeAiOutputStructure(rawData, type);
    const normalizedData = normalizeAiOutputKeys(structuredData);
    const preValidatedData = normalizeForValidation(normalizedData, type);

    const preValCount = Array.isArray(preValidatedData?.[type])
      ? preValidatedData[type].length
      : 0;
    logger.info(
      `[generatePerImageType] "${type}": ${preValCount} items BEFORE validation`
    );

    const { validatedQuestions, validationMeta } = validateAndNormalize(
      preValidatedData,
      [{ type, count: remaining }]
    );

    const valid = validatedQuestions[type] || [];

    logger.info(
      `[generatePerImageType] "${type}": ${valid.length} items AFTER validation ` +
      `(${preValCount - valid.length} rejected)`
    );

    accumulated.push(...valid);

    if (accumulated.length >= count) break;

    logger.warn(
      `[generatePerImageType] "${type}": attempt ${attempts} yielded ` +
      `${valid.length}/${remaining} — ${accumulated.length}/${count} accumulated, retrying...`
    );
  }

  // ── Trim if over ──────────────────────────────────────────────────────────
  if (accumulated.length > count) {
    logger.debug(`[generatePerImageType] "${type}": trimming ${accumulated.length} → ${count}`);
    accumulated = accumulated.slice(0, count);
  }

  const shortage = count - accumulated.length;
  if (shortage > 0) {
    logger.warn(
      `[generatePerImageType] "${type}": exhausted ${MAX_RETRIES} attempts — ` +
      `returning ${accumulated.length}/${count} (shortage: ${shortage})`
    );
  } else {
    logger.info(
      `[generatePerImageType] "${type}": ✓ successfully generated ${accumulated.length}/${count} questions in ${attempts} attempt(s)`
    );
  }

  return {
    type,
    questions: accumulated,
    meta: {
      requested: count,
      returned: accumulated.length,
      shortage,
      attempts,
      retried: lastAiRetried,
    },
    errorCode: null,
    error: null,
  };
};

module.exports = { generateQuestions, generatePerType, generatePerImageType };