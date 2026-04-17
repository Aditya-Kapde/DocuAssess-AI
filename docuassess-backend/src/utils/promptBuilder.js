const logger = require('./logger');

/**
 * Supported question types and their display labels.
 * Single source of truth — update here to add new types.
 */
const QUESTION_TYPE_LABELS = {
  mcq: 'Multiple Choice Questions (MCQ)',
  true_false: 'True/False Questions',
  fill_blanks: 'Fill in the Blank Questions',
  match_following: 'Match the Following',
  ordering: 'Ordering / Sequencing Questions',
  multi_select: 'Multiple Select Questions (choose all that apply)',
};

/**
 * JSON schema templates per question type.
 * Inlined into the prompt so the model has an exact contract to follow.
 */
const SCHEMA_TEMPLATES = {
  mcq: `"mcq": [
    {
      "question": "<question string>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "answer": "<exact text of correct option>"
    }
  ]`,

  true_false: `"true_false": [
    {
      "question": "<statement string>",
      "answer": true | false
    }
  ]`,

  fill_blanks: `"fill_blanks": [
    {
      "question": "<sentence with '____' as the blank>",
      "answer": "<word or phrase that fills the blank>"
    }
  ]`,

  match_following: `"match_following": [
    {
      "left": ["<item 1>", "<item 2>", "<item 3>"],
      "right": ["<match A>", "<match B>", "<match C>"],
      "answer": {
        "<item 1>": "<match X>",
        "<item 2>": "<match Y>",
        "<item 3>": "<match Z>"
      }
    }
  ]`,

  ordering: `"ordering": [
    {
      "question": "<question asking to arrange items>",
      "items": ["<item 1>", "<item 2>", "<item 3>"],
      "correct_order": ["<item 2>", "<item 1>", "<item 3>"]
    }
  ]`,

  multi_select: `"multi_select": [
    {
      "question": "<question string>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "answers": ["<correct option 1>", "<correct option 2>"]
    }
  ]`,
};

/**
 * Maximum characters of context to inject into a single prompt.
 * ~12,000 chars ≈ ~3,000 tokens — safe headroom for Gemini 1.5 Pro (1M ctx).
 * Override via env for tuning without code changes.
 */
const MAX_CONTEXT_LENGTH = parseInt(process.env.MAX_CONTEXT_CHARS, 10) || 12000;

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Joins chunk content strings with a visual separator.
 * Trims to maxContextLength by dropping trailing chunks (not mid-chunk slicing)
 * to preserve semantic coherence.
 *
 * @param {string[]} chunkContents - Array of cleaned chunk text strings
 * @param {number} maxLength
 * @returns {{ context: string, truncated: boolean, usedChunks: number }}
 */
const assembleContext = (chunkContents, maxLength = MAX_CONTEXT_LENGTH) => {
  const SEPARATOR = '\n\n---\n\n';
  let assembled = '';
  let usedChunks = 0;

  for (const content of chunkContents) {
    const candidate =
      assembled.length === 0
        ? content
        : `${assembled}${SEPARATOR}${content}`;

    if (candidate.length > maxLength) {
      // If assembled is still empty, the first chunk itself exceeds the limit.
      // Truncate it at the nearest word boundary instead of returning nothing.
      if (assembled.length === 0) {
        const truncated = content.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        assembled = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
        usedChunks = 1;
        logger.warn(
          `[promptBuilder] First chunk exceeded limit (${content.length}/${maxLength} chars) — ` +
          `truncated to ${assembled.length} chars`
        );
      } else {
        logger.warn(
          `[promptBuilder] Context truncated at chunk ${usedChunks}/${chunkContents.length} ` +
          `(${assembled.length}/${maxLength} chars used)`
        );
      }
      return { context: assembled, truncated: true, usedChunks };
    }

    assembled = candidate;
    usedChunks++;
  }

  return { context: assembled, truncated: false, usedChunks };
};

/**
 * Builds the human-readable question specification line.
 * e.g. "- 5 Multiple Choice Questions (MCQ)\n- 3 True/False Questions"
 *
 * @param {{ type: string, count: number }[]} questionSpec
 * @returns {string}
 */
const buildQuestionSpec = (questionSpec) => {
  return questionSpec
    .map(({ type, count }) => {
      const label = QUESTION_TYPE_LABELS[type] || type;
      return `  - ${count} ${label}`;
    })
    .join('\n');
};

/**
 * Builds the JSON output schema block for requested types only.
 * Injecting only relevant schema keys reduces prompt token waste and
 * prevents the model from generating unrequested question types.
 *
 * @param {string[]} types - e.g. ['mcq', 'true_false']
 * @returns {string}
 */
const buildOutputSchema = (types) => {
  const schemaBlocks = types
    .filter((type) => SCHEMA_TEMPLATES[type])
    .map((type) => SCHEMA_TEMPLATES[type]);

  return `{\n${schemaBlocks.join(',\n')}\n}`;
};

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Builds a fully structured, hallucination-resistant Gemini prompt.
 *
 * @param {object} params
 * @param {string[]} params.chunkContents    - Array of chunk `.content` strings
 * @param {{ type: string, count: number }[]} params.questionSpec - e.g. [{ type: 'mcq', count: 5 }]
 * @param {number} [params.maxContextLength] - Override default context char limit
 *
 * @returns {{
 *   prompt: string,
 *   contextLength: number,
 *   usedChunks: number,
 *   totalChunks: number,
 *   truncated: boolean
 * }}
 */
const buildPrompt = ({ chunkContents, questionSpec, maxContextLength }) => {
  // ── Input validation ──────────────────────────────────────────────────────
  if (!Array.isArray(chunkContents) || chunkContents.length === 0) {
    throw new Error('[promptBuilder] chunkContents must be a non-empty array');
  }

  if (!Array.isArray(questionSpec) || questionSpec.length === 0) {
    throw new Error('[promptBuilder] questionSpec must be a non-empty array');
  }

  const validTypes = Object.keys(QUESTION_TYPE_LABELS);
  for (const spec of questionSpec) {
    if (!spec.type || !validTypes.includes(spec.type)) {
      throw new Error(`[promptBuilder] Unsupported question type: "${spec.type}"`);
    }
    if (!Number.isInteger(spec.count) || spec.count < 1) {
      throw new Error(`[promptBuilder] count for "${spec.type}" must be a positive integer`);
    }
  }

  // ── Assemble context ──────────────────────────────────────────────────────
  const effectiveMaxLength = maxContextLength || MAX_CONTEXT_LENGTH;
  const { context, truncated, usedChunks } = assembleContext(
    chunkContents,
    effectiveMaxLength
  );

  if (!context || context.trim().length === 0) {
    throw new Error('[promptBuilder] Context is empty after assembly — cannot build prompt');
  }

  // ── Build prompt sections ─────────────────────────────────────────────────
  const questionSpecBlock = buildQuestionSpec(questionSpec);
  const types = questionSpec.map((s) => s.type);
  const outputSchemaBlock = buildOutputSchema(types);

  // ── Final prompt ──────────────────────────────────────────────────────────
  const prompt = `
You are a strict assessment generator. Your ONLY job is to create assessment questions
from the CONTEXT provided below. You have NO other knowledge sources.

════════════════════════════════════════
ABSOLUTE RULES — VIOLATION IS NOT ALLOWED
════════════════════════════════════════
1. Use ONLY information explicitly present in the CONTEXT below.
2. DO NOT use any external knowledge, general facts, or assumptions.
3. DO NOT infer, guess, or extrapolate beyond what the CONTEXT states.
4. If you cannot form a valid question strictly from the CONTEXT, SKIP it entirely.
5. Every answer MUST be directly verifiable from the CONTEXT.
6. Return ONLY a valid JSON object — no explanation, no markdown, no preamble.
7. Do NOT include any text outside the JSON object.
8. The JSON must strictly follow the OUTPUT SCHEMA defined below.

════════════════════════════════════════
CONTEXT (your ONLY source of truth)
════════════════════════════════════════
"""
${context}
"""

════════════════════════════════════════
GENERATION TASK
════════════════════════════════════════
Generate the following from the CONTEXT above:
${questionSpecBlock}

════════════════════════════════════════
OUTPUT SCHEMA (follow exactly)
════════════════════════════════════════
${outputSchemaBlock}

════════════════════════════════════════
REMINDER
════════════════════════════════════════
- Output ONLY the JSON object. No extra text.
- Every question and answer must trace back to the CONTEXT.
- If a question type cannot be generated from the CONTEXT, return an empty array for that key.
`.trim();

  logger.info(
    `[promptBuilder] Prompt built — types: [${types.join(', ')}], ` +
    `chunks: ${usedChunks}/${chunkContents.length}, ` +
    `contextLength: ${context.length} chars, truncated: ${truncated}`
  );

  logger.debug(`[promptBuilder] Prompt preview:\n${prompt.slice(0, 500)}...`);

  return {
    prompt,
    contextLength: context.length,
    usedChunks,
    totalChunks: chunkContents.length,
    truncated,
  };
};

module.exports = {
  buildPrompt,
  assembleContext,      // exported for unit testing
  buildQuestionSpec,    // exported for unit testing
  buildOutputSchema,    // exported for unit testing
  QUESTION_TYPE_LABELS, // exported for use in validator
};