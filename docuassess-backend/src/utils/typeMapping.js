const logger = require('./logger');

/**
 * The internal pipeline uses snake_case keys (mcq, true_false, etc.)
 * throughout SCHEMA_TEMPLATES, SCHEMA_REGISTRY, and outputNormalizer.
 *
 * However, the Gemini model sometimes returns JSON with different key names
 * (camelCase, natural language, etc.) despite being prompted with exact keys.
 *
 * This module maps all known AI output variants back to the internal keys
 * so the validation pipeline can find and process the questions.
 */

/**
 * All known AI output key aliases → internal pipeline key.
 * Includes identity mappings so every internal key is covered.
 */
const AI_OUTPUT_ALIASES = {
  // ── Identity (expected keys) ────────────────────────────────────────────
  mcq: 'mcq',
  true_false: 'true_false',
  fill_blanks: 'fill_blanks',
  multi_select: 'multi_select',
  match_following: 'match_following',
  ordering: 'ordering',

  // ── camelCase variants ──────────────────────────────────────────────────
  multipleChoice: 'mcq',
  trueFalse: 'true_false',
  fillInBlanks: 'fill_blanks',
  fillBlanks: 'fill_blanks',
  multiSelect: 'multi_select',
  matchTheFollowing: 'match_following',
  matchFollowing: 'match_following',

  // ── Alternative snake_case variants ─────────────────────────────────────
  multiple_choice: 'mcq',
  true_or_false: 'true_false',
  fill_in_blanks: 'fill_blanks',
  fill_in_the_blanks: 'fill_blanks',
  multi_select_mcq: 'multi_select',
  match_the_following: 'match_following',

  // ── Semantic synonyms the AI might use ──────────────────────────────────
  reordering: 'ordering',
  sequencing: 'ordering',
  sorting: 'ordering',
  sequence: 'ordering',
};

/**
 * Normalizes AI output object keys to the internal pipeline keys
 * that SCHEMA_REGISTRY and SCHEMA_TEMPLATES expect.
 *
 * If a key is recognized (via AI_OUTPUT_ALIASES), it's renamed to the
 * internal key. If multiple AI keys map to the same internal key,
 * their arrays are merged.
 *
 * Unrecognized keys are preserved as-is (they'll simply be ignored
 * by the normalizer since no schema exists for them).
 *
 * @param {object} aiOutput - Raw parsed JSON from Gemini
 * @returns {object} - Same structure with normalized keys
 */
const normalizeAiOutputKeys = (aiOutput) => {
  if (!aiOutput || typeof aiOutput !== 'object' || Array.isArray(aiOutput)) {
    return aiOutput;
  }

  const normalized = {};
  const mappedKeys = []; // For debug logging

  for (const [key, value] of Object.entries(aiOutput)) {
    // Try exact match first, then lowercase
    const internalKey =
      AI_OUTPUT_ALIASES[key] ||
      AI_OUTPUT_ALIASES[key.toLowerCase()] ||
      null;

    if (internalKey) {
      if (key !== internalKey) {
        mappedKeys.push(`"${key}" → "${internalKey}"`);
      }

      // Merge arrays if the same internal key appears from multiple AI keys
      if (normalized[internalKey] && Array.isArray(normalized[internalKey]) && Array.isArray(value)) {
        normalized[internalKey] = [...normalized[internalKey], ...value];
      } else {
        normalized[internalKey] = value;
      }
    } else {
      // Unknown key — keep as-is, will be ignored by normalizer
      normalized[key] = value;
      logger.debug(`[typeMapping] Unknown AI output key "${key}" — keeping as-is`);
    }
  }

  if (mappedKeys.length > 0) {
    logger.info(`[typeMapping] Remapped AI output keys: ${mappedKeys.join(', ')}`);
  }

  return normalized;
};

/**
 * Normalizes the STRUCTURE of AI output into the format the validation
 * pipeline expects: `{ [expectedType]: Array<object> }`.
 *
 * The Gemini model produces inconsistent output shapes:
 *   Case A — A flat array: `[{...}, {...}]`
 *   Case B — A "questions" wrapper: `{ questions: [...] }`
 *   Case C — A string containing JSON (double-serialized)
 *   Case D — A single-key object whose key doesn't match expectedType
 *   Case E — Already correct: `{ mcq: [...] }`
 *
 * This function MUST run BEFORE normalizeAiOutputKeys().
 *
 * @param {*} rawData - The parsed AI response (may be any type)
 * @param {string} expectedType - The internal type key we asked for (e.g. 'mcq')
 * @returns {object} - Always returns `{ [someKey]: [...] }` or empty object
 */
const normalizeAiOutputStructure = (rawData, expectedType) => {
  logger.debug(
    `[typeMapping] normalizeAiOutputStructure — typeof: ${typeof rawData}, ` +
    `isArray: ${Array.isArray(rawData)}, expectedType: "${expectedType}"`
  );

  // ── Case C: String containing JSON (double-serialized) ─────────────────
  if (typeof rawData === 'string') {
    logger.info('[typeMapping] AI output is a string — attempting JSON parse');
    try {
      // Strip markdown fences if present
      const cleaned = rawData
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      logger.info('[typeMapping] Successfully parsed string AI output into object');
      // Recurse with the parsed result
      return normalizeAiOutputStructure(parsed, expectedType);
    } catch (err) {
      logger.warn(`[typeMapping] Failed to parse string AI output: ${err.message}`);
      return {};
    }
  }

  // ── Null / undefined / primitives ──────────────────────────────────────
  if (!rawData || typeof rawData !== 'object') {
    logger.warn(`[typeMapping] AI output is not an object (${typeof rawData}) — returning empty`);
    return {};
  }

  // ── Case A: Flat array ─────────────────────────────────────────────────
  if (Array.isArray(rawData)) {
    logger.info(
      `[typeMapping] AI output is a flat array (${rawData.length} items) — ` +
      `wrapping as { "${expectedType}": [...] }`
    );
    return { [expectedType]: rawData };
  }

  // ── Case B: Nested "questions" wrapper ─────────────────────────────────
  // Handles: { questions: [...] }, { Questions: [...] }, { QUESTIONS: [...] }
  const questionsKey = Object.keys(rawData).find(
    (k) => k.toLowerCase() === 'questions'
  );
  if (questionsKey && Array.isArray(rawData[questionsKey])) {
    logger.info(
      `[typeMapping] AI output has "${questionsKey}" wrapper (${rawData[questionsKey].length} items) — ` +
      `unwrapping as { "${expectedType}": [...] }`
    );
    return { [expectedType]: rawData[questionsKey] };
  }

  // ── Case B.2: Nested wrapper with the type label as key ────────────────
  // Handles: { "Multiple Choice Questions (MCQ)": [...] }
  // or { "True/False Questions": [...] }
  const objKeys = Object.keys(rawData);
  if (objKeys.length === 1) {
    const soleKey = objKeys[0];
    const soleValue = rawData[soleKey];

    // If the single key is already the expected type, it's Case E
    if (soleKey === expectedType) {
      logger.debug(`[typeMapping] AI output already has correct structure — passing through`);
      return rawData;
    }

    // If the single value is an array, re-key it to expectedType
    if (Array.isArray(soleValue)) {
      logger.info(
        `[typeMapping] AI output has single key "${soleKey}" with array (${soleValue.length} items) — ` +
        `re-keying as { "${expectedType}": [...] }`
      );
      return { [expectedType]: soleValue };
    }

    // If the single value is an object with a "questions" array inside
    if (soleValue && typeof soleValue === 'object' && !Array.isArray(soleValue)) {
      const innerQKey = Object.keys(soleValue).find(
        (k) => k.toLowerCase() === 'questions'
      );
      if (innerQKey && Array.isArray(soleValue[innerQKey])) {
        logger.info(
          `[typeMapping] AI output has nested structure "${soleKey}.${innerQKey}" ` +
          `(${soleValue[innerQKey].length} items) — unwrapping as { "${expectedType}": [...] }`
        );
        return { [expectedType]: soleValue[innerQKey] };
      }
    }
  }

  // ── Case E: Already a multi-key or correctly-keyed object ──────────────
  logger.debug(
    `[typeMapping] AI output is an object with keys [${objKeys.join(', ')}] — passing through`
  );
  return rawData;
};

module.exports = { AI_OUTPUT_ALIASES, normalizeAiOutputKeys, normalizeAiOutputStructure };
