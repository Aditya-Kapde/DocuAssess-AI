const { getGeminiModel } = require('../config/gemini.config');
const { safeJsonParse, buildJsonFixPrompt } = require('../utils/jsonParser');
const logger = require('../utils/logger');

// ✅ FIXED MODEL (important)
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Calls the Gemini API with the given prompt and returns parsed JSON.
 * Retries once with a JSON-fix prompt if initial parse fails.
 *
 * @param {string} prompt - Fully assembled prompt from promptBuilder
 * @returns {{
 *   success: boolean,
 *   data: object | null,
 *   retried: boolean,
 *   errorCode: string | null,
 *   error: string | null
 * }}
 */
const generateFromPrompt = async (prompt) => {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new Error('[ai.service] Prompt must be a non-empty string');
  }

  const model = getGeminiModel(MODEL_NAME);

  // ── Attempt 1: Primary generation ────────────────────────────────────────
  let rawOutput;
  try {
    logger.info(`[ai.service] Sending prompt to Gemini (model: ${MODEL_NAME})`);

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    });

    rawOutput = result.response.text();

    logger.debug(
      `[ai.service] Raw response (first 300 chars): ${rawOutput?.slice(0, 300)}`
    );

  } catch (err) {
    logger.error(`[ai.service] Gemini API call failed: ${err.message}`);
    return {
      success: false,
      data: null,
      retried: false,
      errorCode: 'API_CALL_FAILED',
      error: err.message,
    };
  }

  // ── Parse attempt 1 ───────────────────────────────────────────────────────
  const firstParse = safeJsonParse(rawOutput);

  if (firstParse.success) {
    logger.info('[ai.service] Response parsed successfully on first attempt');
    return {
      success: true,
      data: firstParse.data,
      retried: false,
      errorCode: null,
      error: null,
    };
  }

  // ── Attempt 2: JSON-fix retry ─────────────────────────────────────────────
  logger.warn('[ai.service] First parse failed — retrying with JSON-fix prompt');

  let retryRawOutput;
  try {
    const fixPrompt = buildJsonFixPrompt(rawOutput);

    const retryResult = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: fixPrompt }]
        }
      ]
    });

    retryRawOutput = retryResult.response.text();

    logger.debug(
      `[ai.service] Retry raw response (first 300 chars): ${retryRawOutput?.slice(0, 300)}`
    );

  } catch (err) {
    logger.error(`[ai.service] Gemini retry API call failed: ${err.message}`);
    return {
      success: false,
      data: null,
      retried: true,
      errorCode: 'RETRY_API_CALL_FAILED',
      error: err.message,
    };
  }

  // ── Parse attempt 2 ───────────────────────────────────────────────────────
  const retryParse = safeJsonParse(retryRawOutput);

  if (retryParse.success) {
    logger.info('[ai.service] Response parsed successfully after retry');
    return {
      success: true,
      data: retryParse.data,
      retried: true,
      errorCode: null,
      error: null,
    };
  }

  // ── Both attempts failed ──────────────────────────────────────────────────
  logger.error('[ai.service] Both parse attempts failed — returning error');

  return {
    success: false,
    data: null,
    retried: true,
    errorCode: 'PARSE_FAILED',
    error: retryParse.error,
  };
};

module.exports = { generateFromPrompt };