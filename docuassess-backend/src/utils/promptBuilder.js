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

  // Image-based question types
  diagram_mcq: 'Diagram-based Multiple Choice Questions',
  graph_analysis: 'Graph / Chart Analysis Questions',
  label_identification: 'Label Identification Questions',
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

  // ── Image-based types ─────────────────────────────────────────────────

  diagram_mcq: `"diagram_mcq": [
    {
      "question": "<conceptual question about the diagram>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "answer": "<exact text of correct option>",
      "sourceImage": "<page number the diagram is from>"
    }
  ]`,

  graph_analysis: `"graph_analysis": [
    {
      "question": "<analytical question about the graph/chart>",
      "answer": "<concise factual answer>",
      "sourceImage": "<page number the graph is from>"
    }
  ]`,

  label_identification: `"label_identification": [
    {
      "question": "<question asking to identify a label or component>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "answer": "<exact text of correct option>",
      "sourceImage": "<page number the image is from>"
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
You are an assessment generator. Your job is to create assessment questions
based ONLY on the TEXT CONTEXT provided below. No visual elements exist.

════════════════════════════════════════
RULES (STRICT — VIOLATIONS INVALIDATE OUTPUT)
════════════════════════════════════════
1. Base all questions on the CONTEXT below.
2. You may use reasonable inference and paraphrasing based on the context.
3. If exact phrasing is not available, you may rephrase or simplify the content into a valid question.
4. DO NOT use external knowledge or general facts unrelated to the CONTEXT.
5. Every answer MUST be verifiable or derivable from the CONTEXT.
6. Return ONLY a valid JSON object — no explanation, no markdown, no preamble.
7. Do NOT include any text outside the JSON object.
8. The JSON must strictly follow the OUTPUT SCHEMA defined below.

════════════════════════════════════════
CRITICAL: TEXT-ONLY CONSTRAINT
════════════════════════════════════════
You MUST NOT include any reference to diagrams, figures, charts, images,
illustrations, or visual elements under ANY circumstance. If you do,
the ENTIRE output is INVALID and will be rejected.

Each question must be fully understandable WITHOUT any external visual context.
If a question would require a diagram or image to make sense, DO NOT generate
that question — replace it with a different text-based question instead.

Return ONLY clean text-based questions. Do NOT assume any visual information exists.

FORBIDDEN WORDS (must NEVER appear in any question text):
diagram, figure, shown, image, illustration, graph, chart, picture,
"refer to", "based on the figure", "see the image", "as shown"

Before finalizing your response, verify that NONE of the forbidden words
appear anywhere in your output. Any violation makes the output incorrect.

Any violation of these rules makes the answer incorrect. Strictly comply.

════════════════════════════════════════
CONTEXT
════════════════════════════════════════
"""
${context}
"""

════════════════════════════════════════
GENERATION TASK
════════════════════════════════════════
Generate EXACTLY the following from the CONTEXT above. No more, no less.
${questionSpecBlock}

You MUST generate EXACTLY the specified number of questions for each type.
You MUST attempt to generate the requested number of questions using the available context.
Generating fewer or more than the requested count is a violation.

════════════════════════════════════════
OUTPUT SCHEMA (follow exactly)
════════════════════════════════════════
${outputSchemaBlock}

════════════════════════════════════════
FINAL REMINDER
════════════════════════════════════════
- Output ONLY the JSON object. No extra text.
- Every question and answer must relate to the CONTEXT.
- You MUST produce EXACTLY the requested count for each question type.
- This is a TEXT-ONLY task. ZERO visual references allowed.
- Forbidden words trigger automatic rejection.
- Strictly comply — any violation makes the output incorrect.
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

// ═══════════════════════════════════════════════════════════════════════════════
// Image-based prompt builder
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Set of question types that require image-derived context.
 */
const IMAGE_BASED_TYPES = new Set([
  'diagram_mcq',
  'graph_analysis',
  'label_identification',
]);

/**
 * Checks whether a question type uses image-derived context.
 * @param {string} type
 * @returns {boolean}
 */
const isImageBasedType = (type) => IMAGE_BASED_TYPES.has(type);

/**
 * Assembles a text-based context block from image chunk metadata.
 * Each image chunk contributes: page, concepts, description, labels.
 *
 * @param {Array<{ page: number, concepts: string[], description: string, labels: string[] }>} imageChunks
 * @returns {string}
 */
const assembleImageContext = (imageChunks) => {
  return imageChunks
    .map((chunk) => {
      const parts = [
        `[Page ${chunk.page}]`,
        `Description: ${chunk.description || 'N/A'}`,
        `Concepts: ${(chunk.concepts || []).join(', ') || 'N/A'}`,
      ];
      if (chunk.labels && chunk.labels.length > 0) {
        parts.push(`Labels: ${chunk.labels.join(', ')}`);
      }
      return parts.join('\n');
    })
    .join('\n\n---\n\n');
};

/**
 * Builds a prompt for image-based question generation.
 * Uses image chunk metadata (concepts, descriptions, labels) as context
 * instead of raw text chunks.
 *
 * @param {object} params
 * @param {Array<{ page: number, concepts: string[], description: string, labels: string[] }>} params.imageChunks
 * @param {{ type: string, count: number }[]} params.questionSpec
 * @param {boolean} [params.forceImage=false] - When true, instructs the AI that the image WILL be shown
 * @returns {{
 *   prompt: string,
 *   usedChunks: number,
 *   truncated: boolean
 * }}
 */
const buildImagePrompt = ({ imageChunks, questionSpec, forceImage = false }) => {
  if (!Array.isArray(imageChunks) || imageChunks.length === 0) {
    throw new Error('[promptBuilder] imageChunks must be a non-empty array');
  }

  if (!Array.isArray(questionSpec) || questionSpec.length === 0) {
    throw new Error('[promptBuilder] questionSpec must be a non-empty array');
  }

  const imageContext = assembleImageContext(imageChunks);
  const questionSpecBlock = buildQuestionSpec(questionSpec);
  const types = questionSpec.map((s) => s.type);
  const outputSchemaBlock = buildOutputSchema(types);

  // Conditionally add force-image instruction
  const forceImageBlock = forceImage
    ? `
════════════════════════════════════════
IMAGE USAGE (MANDATORY)
════════════════════════════════════════
A relevant image WILL be shown to the student alongside these questions.
- This question MUST use the provided image. Do not describe it fully. Refer to it.
- Write questions that REQUIRE looking at the image to answer (e.g. "Refer to the diagram shown.").
- Set "useImage": true on EVERY question.
- Do NOT re-describe what the image shows — assume the student can see it.
`
    : '';

  const prompt = `
You are given image-derived context extracted from a document.
Generate conceptual and diagram-based questions based on this context.

════════════════════════════════════════
RULES
════════════════════════════════════════
1. Base all questions on the IMAGE CONTEXT below.
2. Questions should test understanding of visual elements: diagrams, graphs, labels, and relationships.
3. DO NOT use external knowledge or general facts unrelated to the context.
4. Every answer MUST be verifiable or derivable from the context.
5. Return ONLY a valid JSON object — no explanation, no markdown, no preamble.
6. Do NOT include any text outside the JSON object.
7. The JSON must strictly follow the OUTPUT SCHEMA defined below.
8. Include the "sourceImage" field referencing the page number.
9. If a question depends on visual context (diagram, graph, chart, image), refer to it
   without describing it fully (e.g. "Refer to the diagram on page X") and add "useImage": true
   to that question object. If the question is purely text-based, set "useImage": false or omit it.
${forceImageBlock}
════════════════════════════════════════
IMAGE CONTEXT
════════════════════════════════════════
"""
${imageContext}
"""

════════════════════════════════════════
GENERATION TASK
════════════════════════════════════════
Generate EXACTLY the following from the IMAGE CONTEXT above. No more, no less.
${questionSpecBlock}

You MUST generate EXACTLY the specified number of questions for each type.
Generating fewer or more than the requested count is a violation.

════════════════════════════════════════
OUTPUT SCHEMA (follow exactly)
════════════════════════════════════════
${outputSchemaBlock}

════════════════════════════════════════
REMINDER
════════════════════════════════════════
- Output ONLY the JSON object. No extra text.
- Every question and answer must relate to the IMAGE CONTEXT.
- You MUST produce EXACTLY the requested count for each question type.
- Always reference the page number in the "sourceImage" field.
- Set "useImage": true on any question that requires seeing the original image to answer.
`.trim();

  logger.info(
    `[promptBuilder] Image prompt built — types: [${types.join(', ')}], ` +
    `imageChunks: ${imageChunks.length}, forceImage: ${forceImage}`
  );

  return {
    prompt,
    usedChunks: imageChunks.length,
    truncated: false,
  };
};

/**
 * Post-processing cleanup: strips any residual visual references
 * that the AI may have generated despite prompt constraints.
 * Applied to question text AFTER AI generation as a safety net.
 *
 * @param {string} text - Raw question text from AI
 * @returns {string} - Cleaned text with visual references removed
 */
const cleanVisualReferences = (text) => {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/refer to the diagram shown\.?\s*/gi, '')
    .replace(/refer to the diagram\.?\s*/gi, '')
    .replace(/refer to the figure\.?\s*/gi, '')
    .replace(/based on the figure\.?\s*/gi, '')
    .replace(/see the image\.?\s*/gi, '')
    .replace(/as shown in the (?:diagram|figure|image|illustration)\.?\s*/gi, '')
    .replace(/as shown\.?\s*/gi, '')
    .replace(/in the (?:diagram|figure) (?:below|above|shown)\.?\s*/gi, '')
    .replace(/looking at the (?:diagram|figure|image)\.?\s*/gi, '')
    .replace(/from the (?:diagram|figure|image)\.?\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

module.exports = {
  buildPrompt,
  buildImagePrompt,
  cleanVisualReferences,   // post-processing cleanup
  assembleContext,         // exported for unit testing
  assembleImageContext,    // exported for unit testing
  buildQuestionSpec,       // exported for unit testing
  buildOutputSchema,       // exported for unit testing
  QUESTION_TYPE_LABELS,    // exported for use in validator
  IMAGE_BASED_TYPES,       // exported for type detection
  isImageBasedType,        // exported for type detection
};