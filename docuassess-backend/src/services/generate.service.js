const { retrieveContext } = require('./rag.service');
const { buildPrompt } = require('../utils/promptBuilder');
const { generateFromPrompt } = require('./ai.service');
const { validateAndNormalize } = require('../utils/outputNormalizer');
const { normalizeAiOutputKeys, normalizeAiOutputStructure } = require('../utils/typeMapping');
const { normalizeForValidation } = require('../utils/preValidation');
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

  // ── Stage 1: Retrieve context chunks (shared across all types) ───────────
  const { contents, totalChunks } = await retrieveContext(fileId);

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
    `[generate.service] Retrieved ${contents.length}/${totalChunks} chunks for context`
  );

  // ── Stage 2: Generate per type (sequential) ──────────────────────────────
  const allQuestions = [];
  const perTypeMeta = {};
  let anyAiError = null;

  for (const [type, count] of Object.entries(effectiveConfig)) {
    logger.info(
      `[generate.service] ── Processing type: "${type}" (count: ${count}) ──`
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

module.exports = { generateQuestions, generatePerType };