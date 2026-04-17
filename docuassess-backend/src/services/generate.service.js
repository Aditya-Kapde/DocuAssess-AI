const { retrieveContext } = require('./rag.service');
const { buildPrompt } = require('../utils/promptBuilder');
const { generateFromPrompt } = require('./ai.service');
const { validateAndNormalize } = require('../utils/outputNormalizer');
const logger = require('../utils/logger');

/**
 * Full generation pipeline:
 * retrieve → transform → build prompt → call AI → validate → return
 */
const generateQuestions = async ({ fileId, questionTypes, count }) => {
  // ── Stage 1: Retrieve context chunks ─────────────────────────────────────
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

  // ── Stage 2: Transform input → questionSpec (FIXED) ──────────────────────
  if (!Array.isArray(questionTypes) || questionTypes.length === 0) {
    throw new Error('[generate.service] questionTypes must be a non-empty array');
  }

  if (!Number.isInteger(count) || count < 1) {
    throw new Error('[generate.service] count must be a positive integer');
  }

  const baseCount = Math.floor(count / questionTypes.length);
  const remainder = count % questionTypes.length;

  const questionSpec = questionTypes.map((type, index) => ({
    type,
    count: baseCount + (index < remainder ? 1 : 0),
  }));

  logger.debug(
    `[generate.service] Transformed questionSpec: ${JSON.stringify(questionSpec)}`
  );

  // ── Stage 3: Build prompt ────────────────────────────────────────────────
  const { prompt, usedChunks, truncated } = buildPrompt({
    chunkContents: contents,
    questionSpec,
  });

  // ── Stage 4: Call AI ─────────────────────────────────────────────────────
  const aiResult = await generateFromPrompt(prompt);

  if (!aiResult.success) {
    logger.error(
      `[generate.service] AI generation failed for fileId ${fileId}: ${aiResult.errorCode}`
    );
    return {
      success: false,
      questions: null,
      meta: {
        retried: aiResult.retried,
        usedChunks,
        totalChunks,
        truncated,
        validation: null,
      },
      errorCode: aiResult.errorCode,
      error: aiResult.error,
    };
  }

  // ── Stage 5: Validate + normalize AI output ──────────────────────────────
  const { validatedQuestions, validationMeta } = validateAndNormalize(
    aiResult.data,
    questionSpec
  );

  logger.info(
    `[generate.service] Pipeline complete for fileId: ${fileId} | ` +
    `valid: ${validationMeta.validCount}, invalid: ${validationMeta.invalidCount}`
  );

  return {
    success: true,
    questions: validatedQuestions,
    meta: {
      retried: aiResult.retried,
      usedChunks,
      totalChunks,
      truncated,
      validation: validationMeta,
    },
    errorCode: null,
    error: null,
  };
};

module.exports = { generateQuestions };