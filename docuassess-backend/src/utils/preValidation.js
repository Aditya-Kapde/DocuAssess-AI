const logger = require('./logger');

/**
 * Pre-validation normalization for AI-generated questions.
 *
 * Fixes minor formatting inconsistencies that would cause valid questions
 * to be rejected by the strict Zod schemas in output.validator.js.
 *
 * This runs BEFORE validateAndNormalize() and does NOT change validation logic.
 */

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Trims a value if it's a string, returns as-is otherwise.
 */
const trimStr = (v) => (typeof v === 'string' ? v.trim() : v);

/**
 * Normalizes internal whitespace (collapse multiple spaces/tabs to single space).
 */
const normalizeWhitespace = (s) =>
  typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : s;

/**
 * Finds the best case-insensitive match for `target` in `candidates`.
 * Returns the exact candidate string if a match is found, otherwise returns target unchanged.
 */
const findExactMatch = (target, candidates) => {
  if (!target || !Array.isArray(candidates)) return target;
  const trimmedTarget = target.trim().toLowerCase();

  // Try exact match first
  const exact = candidates.find((c) => c === target);
  if (exact) return exact;

  // Try trimmed match
  const trimmed = candidates.find((c) => c.trim() === target.trim());
  if (trimmed) return trimmed;

  // Try case-insensitive match
  const caseMatch = candidates.find(
    (c) => c.trim().toLowerCase() === trimmedTarget
  );
  if (caseMatch) return caseMatch;

  return target;
};

// ─── Per-type normalizers ──────────────────────────────────────────────────────

/**
 * MCQ: Trim options/answer, fix answer to match an option exactly.
 *
 * Schema requires: val.options.includes(val.answer)
 * AI often returns answer with different casing or extra whitespace.
 */
const normalizeMcq = (q) => {
  if (!q || typeof q !== 'object') return q;

  const options = Array.isArray(q.options)
    ? q.options.map((o) => normalizeWhitespace(o))
    : q.options;

  let answer = normalizeWhitespace(q.answer);

  // Fix answer to exactly match an option (case-insensitive)
  if (answer && Array.isArray(options)) {
    answer = findExactMatch(answer, options);
  }

  return {
    ...q,
    question: normalizeWhitespace(q.question),
    options,
    answer,
  };
};

/**
 * True/False: Convert string "true"/"false" → boolean.
 *
 * Schema requires: z.boolean() — rejects string "true" and numbers.
 * AI frequently returns "true"/"false" as strings, or "True"/"False".
 */
const normalizeTrueFalse = (q) => {
  if (!q || typeof q !== 'object') return q;

  let answer = q.answer;

  if (typeof answer === 'string') {
    const lower = answer.trim().toLowerCase();
    if (lower === 'true') answer = true;
    else if (lower === 'false') answer = false;
    // else leave as-is — will fail validation (intentionally)
  } else if (typeof answer === 'number') {
    if (answer === 1) answer = true;
    else if (answer === 0) answer = false;
  }

  return {
    ...q,
    question: normalizeWhitespace(q.question),
    answer,
  };
};

/**
 * Fill in the blanks: Normalize blank markers to exactly "____".
 *
 * Schema requires: question.includes('____') (four underscores)
 * AI may use: ___, _____, _______, _**_, **__, _________, [blank], (blank), etc.
 */
const fillBlankPattern = /_{2,}|\*{2,}_{1,}\*{0,}|_{1,}\*{1,}_{0,}|\[blank\]|\(blank\)|\[___+\]|\(___+\)/gi;

const normalizeFillBlanks = (q) => {
  if (!q || typeof q !== 'object') return q;

  let question = normalizeWhitespace(q.question);

  if (typeof question === 'string') {
    // Replace any blank-like pattern with standard "____"
    question = question.replace(fillBlankPattern, '____');

    // If still no blank marker and there's a clear gap, add one
    // (some AI puts "..." or "…" for blanks)
    if (!question.includes('____')) {
      question = question.replace(/\.{3,}|…/g, '____');
    }
  }

  return {
    ...q,
    question,
    answer: normalizeWhitespace(q.answer),
  };
};

/**
 * Multi-select: Fix answers array to exactly match options.
 *
 * Schema requires: every answer in val.answers must be in val.options
 * AI may return answers with different casing or whitespace.
 */
const normalizeMultiSelect = (q) => {
  if (!q || typeof q !== 'object') return q;

  const options = Array.isArray(q.options)
    ? q.options.map((o) => normalizeWhitespace(o))
    : q.options;

  let answers = Array.isArray(q.answers)
    ? q.answers.map((a) => normalizeWhitespace(a))
    : q.answers;

  // Fix each answer to exactly match an option
  if (Array.isArray(answers) && Array.isArray(options)) {
    answers = answers.map((a) => findExactMatch(a, options));
  }

  return {
    ...q,
    question: normalizeWhitespace(q.question),
    options,
    answers,
  };
};

/**
 * Ordering: Normalize items and correct_order so they match exactly.
 *
 * Schema requires: correct_order is a permutation of items (exact string match after sort).
 * AI may return items with different casing or whitespace between the two arrays.
 */
const normalizeOrdering = (q) => {
  if (!q || typeof q !== 'object') return q;

  const items = Array.isArray(q.items)
    ? q.items.map((i) => normalizeWhitespace(i))
    : q.items;

  let correctOrder = Array.isArray(q.correct_order)
    ? q.correct_order.map((i) => normalizeWhitespace(i))
    : q.correct_order;

  // Fix each correct_order item to exactly match an item from the items array
  if (Array.isArray(correctOrder) && Array.isArray(items)) {
    correctOrder = correctOrder.map((co) => findExactMatch(co, items));
  }

  return {
    ...q,
    question: normalizeWhitespace(q.question),
    items,
    correct_order: correctOrder,
  };
};

/**
 * Match the following: Normalize left/right arrays and answer map keys.
 *
 * Schema requires: every left item must be a key in answer map.
 * AI may return answer map keys with different casing/whitespace than left items.
 */
const normalizeMatchFollowing = (q) => {
  if (!q || typeof q !== 'object') return q;

  const left = Array.isArray(q.left)
    ? q.left.map((l) => normalizeWhitespace(l))
    : q.left;

  const right = Array.isArray(q.right)
    ? q.right.map((r) => normalizeWhitespace(r))
    : q.right;

  let answer = q.answer;

  // Normalize answer map: fix keys to match left items exactly
  if (answer && typeof answer === 'object' && !Array.isArray(answer) && Array.isArray(left)) {
    const normalizedAnswer = {};

    for (const [key, value] of Object.entries(answer)) {
      const normalizedKey = normalizeWhitespace(key);
      // Find the exact left item this key corresponds to
      const matchedKey = findExactMatch(normalizedKey, left);
      normalizedAnswer[matchedKey] = normalizeWhitespace(value);
    }

    answer = normalizedAnswer;
  }

  return {
    ...q,
    left,
    right,
    answer,
  };
};

// ─── Dispatcher ────────────────────────────────────────────────────────────────

/**
 * Type → normalizer function mapping.
 */
const TYPE_NORMALIZERS = {
  mcq: normalizeMcq,
  true_false: normalizeTrueFalse,
  fill_blanks: normalizeFillBlanks,
  multi_select: normalizeMultiSelect,
  ordering: normalizeOrdering,
  match_following: normalizeMatchFollowing,
};

/**
 * Normalizes an entire AI output object for validation.
 *
 * For each type key in the data, applies the type-specific normalizer
 * to every question in the array. This fixes minor formatting issues
 * so that valid questions are not rejected by strict Zod schemas.
 *
 * @param {object} data - AI output with structure { [type]: Array<object> }
 * @param {string} type - The expected question type key
 * @returns {object} - Same structure with normalized questions
 */
const normalizeForValidation = (data, type) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;

  const items = data[type];
  if (!Array.isArray(items)) {
    logger.debug(`[preValidation] "${type}": no array found — skipping normalization`);
    return data;
  }

  const normalizer = TYPE_NORMALIZERS[type];
  if (!normalizer) {
    logger.debug(`[preValidation] "${type}": no normalizer registered — skipping`);
    return data;
  }

  const beforeCount = items.length;
  const normalized = items.map((item, index) => {
    try {
      return normalizer(item);
    } catch (err) {
      logger.debug(
        `[preValidation] "${type}" item[${index}]: normalization error — ${err.message}`
      );
      return item; // Return original on error
    }
  });

  logger.debug(
    `[preValidation] "${type}": normalized ${beforeCount} items for validation`
  );

  return { ...data, [type]: normalized };
};

module.exports = {
  normalizeForValidation,
  // Exported for testing
  normalizeMcq,
  normalizeTrueFalse,
  normalizeFillBlanks,
  normalizeMultiSelect,
  normalizeOrdering,
  normalizeMatchFollowing,
};
