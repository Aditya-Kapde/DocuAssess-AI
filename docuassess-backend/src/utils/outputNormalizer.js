const { SCHEMA_REGISTRY } = require('../validators/output.validator');
const logger = require('./logger');

/**
 * Safely extracts an array for a given question type from AI output.
 * Returns empty array if key is missing, null, or not an array.
 *
 * @param {object} aiOutput - Raw parsed AI JSON
 * @param {string} type     - e.g. 'mcq'
 * @returns {unknown[]}
 */
const extractTypeArray = (aiOutput, type) => {
  const value = aiOutput?.[type];

  if (!Array.isArray(value)) {
    if (value !== undefined && value !== null) {
      logger.debug(
        `[outputNormalizer] Expected array for type "${type}", got ${typeof value} — treating as empty`
      );
    }
    return [];
  }

  return value;
};

/**
 * Validates each item in an array against the Zod schema for its type.
 * Invalid items are dropped and logged at debug level.
 * Returns only items that pass schema validation.
 *
 * @param {unknown[]} items
 * @param {string} type
 * @returns {{ valid: object[], invalidCount: number, issues: string[] }}
 */
const filterValidEntries = (items, type) => {
  const schema = SCHEMA_REGISTRY[type];

  if (!schema) {
    logger.warn(`[outputNormalizer] No schema registered for type "${type}" — skipping all items`);
    return { valid: [], invalidCount: items.length, issues: [`No schema for type: ${type}`] };
  }

  const valid = [];
  const issues = [];
  let invalidCount = 0;

  items.forEach((item, index) => {
    const result = schema.safeParse(item);

    if (result.success) {
      valid.push(result.data);
    } else {
      invalidCount++;
      const errorMessages = result.error.errors
        .map((e) => `[${e.path.join('.')}] ${e.message}`)
        .join('; ');

      const issueLog = `Item[${index}] invalid — ${errorMessages}`;
      issues.push(issueLog);
      logger.debug(`[outputNormalizer] ${type}.${issueLog}`);
    }
  });

  if (invalidCount > 0) {
    logger.warn(
      `[outputNormalizer] "${type}": dropped ${invalidCount}/${items.length} invalid items`
    );
  }

  return { valid, invalidCount, issues };
};

/**
 * Truncates valid items to the requested count.
 * Logs a warning if fewer items are available than requested.
 *
 * @param {object[]} validItems
 * @param {string} type
 * @param {number} requestedCount
 * @returns {{ enforced: object[], shortage: number }}
 */
const enforceCount = (validItems, type, requestedCount) => {
  if (validItems.length > requestedCount) {
    logger.debug(
      `[outputNormalizer] "${type}": truncating ${validItems.length} → ${requestedCount}`
    );
    return { enforced: validItems.slice(0, requestedCount), shortage: 0 };
  }

  const shortage = requestedCount - validItems.length;

  if (shortage > 0) {
    logger.warn(
      `[outputNormalizer] "${type}": requested ${requestedCount}, ` +
      `only ${validItems.length} valid items available (shortage: ${shortage})`
    );
  }

  return { enforced: validItems, shortage };
};

/**
 * Full validation pipeline for AI output.
 * Processes each requested question type independently.
 *
 * @param {object} aiOutput     - Raw parsed object from Gemini
 * @param {{ type: string, count: number }[]} questionSpec - Original request spec
 * @returns {{
 *   validatedQuestions: Record<string, object[]>,
 *   validationMeta: {
 *     requestedTypes: string[],
 *     perType: Record<string, {
 *       requested: number,
 *       received: number,
 *       valid: number,
 *       invalid: number,
 *       returned: number,
 *       shortage: number
 *     }>
 *   }
 * }}
 */
const validateAndNormalize = (aiOutput, questionSpec) => {
  if (!aiOutput || typeof aiOutput !== 'object' || Array.isArray(aiOutput)) {
    logger.error('[outputNormalizer] aiOutput is not a valid object — returning empty result');
    return {
      validatedQuestions: {},
      validationMeta: { requestedTypes: [], perType: {} },
    };
  }

  const validatedQuestions = {};
  const perType = {};

  for (const { type, count } of questionSpec) {
    // Step 1: Extract array safely
    const raw = extractTypeArray(aiOutput, type);

    // Step 2: Validate each item against schema
    const { valid, invalidCount, issues } = filterValidEntries(raw, type);

    // Step 3: Enforce requested count
    const { enforced, shortage } = enforceCount(valid, type, count);

    validatedQuestions[type] = enforced;

    perType[type] = {
      requested: count,
      received: raw.length,
      valid: valid.length,
      invalid: invalidCount,
      returned: enforced.length,
      shortage,
      ...(issues.length > 0 && { issues }),
    };
  }

  logger.info(
    `[outputNormalizer] Validation complete — ` +
    Object.entries(perType)
      .map(([t, s]) => `${t}: ${s.returned}/${s.requested}`)
      .join(', ')
  );

  return { validatedQuestions, validationMeta: { requestedTypes: Object.keys(perType), perType } };
};

module.exports = {
  validateAndNormalize,
  extractTypeArray,
  filterValidEntries,
  enforceCount,
};