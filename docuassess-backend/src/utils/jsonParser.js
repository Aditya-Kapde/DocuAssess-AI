const logger = require('./logger');

/**
 * Strips markdown code fences and trims whitespace from a raw model response.
 * Handles: ```json ... ```, ``` ... ```, inline backticks, leading/trailing text.
 * @param {string} raw
 * @returns {string}
 */
const sanitizeModelOutput = (raw) => {
  if (!raw || typeof raw !== 'string') return '';

  return raw
    // Remove ```json ... ``` or ``` ... ``` fences
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    // Remove any text before the first { or [
    .replace(/^[^{\[]*/, '')
    // Remove any text after the last } or ]
    .replace(/[^}\]]*$/, '')
    .trim();
};

/**
 * Attempts to parse a sanitized string as JSON.
 * Returns a structured result — never throws.
 *
 * @param {string} raw - Raw string from Gemini
 * @returns {{
 *   success: boolean,
 *   data: object | null,
 *   sanitized: string,
 *   error: string | null
 * }}
 */
const safeJsonParse = (raw) => {
  const sanitized = sanitizeModelOutput(raw);

  if (!sanitized) {
    return {
      success: false,
      data: null,
      sanitized,
      error: 'Output is empty after sanitization',
    };
  }

  try {
    const data = JSON.parse(sanitized);
    return { success: true, data, sanitized, error: null };
  } catch (err) {
    logger.warn(`[jsonParser] JSON.parse failed: ${err.message}`);
    return {
      success: false,
      data: null,
      sanitized,
      error: err.message,
    };
  }
};

/**
 * Builds a JSON-fix retry prompt using the broken output.
 * Instructs the model to return ONLY valid JSON with no other text.
 * @param {string} brokenOutput
 * @returns {string}
 */
const buildJsonFixPrompt = (brokenOutput) => {
  return `
The following text is supposed to be a valid JSON object but it is malformed or contains extra text.

Your task:
1. Fix it into a valid JSON object.
2. Return ONLY the JSON object — no explanation, no markdown, no extra text.
3. Do NOT add, remove, or change any question content.
4. Do NOT wrap the output in code fences.

Malformed output:
"""
${brokenOutput}
"""
`.trim();
};

module.exports = { safeJsonParse, sanitizeModelOutput, buildJsonFixPrompt };