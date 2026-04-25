/**
 * exportFormatter.js
 *
 * Transforms internal question format into the strict export JSON schema.
 * This is a standalone, isolated layer — it does NOT modify or depend on
 * the generation, validation, or normalization pipelines.
 */

// ── Type Mapping ─────────────────────────────────────────────
const TYPE_MAP = {
  mcq: 'multipleChoice',
  true_false: 'trueFalse',
  fill_blanks: 'fillInBlanks',
  multi_select: 'multiSelect',
  match_following: 'matchTheFollowing',
  ordering: 'reordering',
};

const DEFAULT_MARKS = 1;

// ── Helpers ──────────────────────────────────────────────────

/**
 * Build the standard `question` object used across all types.
 */
function buildQuestionObj(text) {
  return {
    hide_text: false,
    text: typeof text === 'string' ? text : '',
    read_text: false,
    image: '',
  };
}

/**
 * Build a standard option object (for MCQ / multi-select).
 */
function buildOptionObj(text) {
  return {
    hide_text: false,
    text: typeof text === 'string' ? text : '',
    read_text: false,
    image: '',
  };
}

// ── Per-type transformers ────────────────────────────────────

function transformFillInBlanks(q, globalId) {
  return {
    id: globalId,
    marks: DEFAULT_MARKS,
    question: buildQuestionObj(q.question),
    correctAnswer: typeof q.answer === 'string' ? q.answer : String(q.answer ?? ''),
    alternatives: [],
    explanation: '',
  };
}

function transformMultipleChoice(q, globalId) {
  return {
    id: globalId,
    marks: DEFAULT_MARKS,
    question: buildQuestionObj(q.question),
    options: (q.options || []).map(buildOptionObj),
    correctAnswer: typeof q.answer === 'string' ? q.answer : String(q.answer ?? ''),
    explanation: '',
  };
}

function transformMultiSelect(q, globalId) {
  const correctAnswer = Array.isArray(q.answer)
    ? q.answer.map(String)
    : [String(q.answer ?? '')];

  return {
    id: globalId,
    marks: DEFAULT_MARKS,
    question: buildQuestionObj(q.question),
    options: (q.options || []).map(buildOptionObj),
    correctAnswer,
    explanation: '',
  };
}

function transformMatchTheFollowing(q, globalId) {
  // answer is expected as an array of matched pairs (strings)
  // options typically contains the items to match
  const pairs = Array.isArray(q.answer) ? q.answer : [];
  const leftItems = [];
  const rightItems = [];
  const correctAnswer = [];

  pairs.forEach((pair) => {
    if (typeof pair === 'string' && pair.includes('→')) {
      const [left, right] = pair.split('→').map((s) => s.trim());
      leftItems.push(left);
      rightItems.push(right);
      correctAnswer.push({ left, right });
    } else if (typeof pair === 'object' && pair.left && pair.right) {
      leftItems.push(pair.left);
      rightItems.push(pair.right);
      correctAnswer.push({ left: pair.left, right: pair.right });
    }
  });

  return {
    id: globalId,
    marks: DEFAULT_MARKS,
    question: buildQuestionObj(q.question),
    leftItems,
    rightItems,
    correctAnswer,
    explanation: '',
  };
}

function transformReordering(q, globalId) {
  const items = Array.isArray(q.options) ? q.options.map(String) : [];
  const correctAnswer = Array.isArray(q.answer) ? q.answer.map(String) : items;

  return {
    id: globalId,
    marks: DEFAULT_MARKS,
    question: buildQuestionObj(q.question),
    items,
    correctAnswer,
    explanation: '',
  };
}

function transformTrueFalse(q, globalId) {
  let answer;
  if (typeof q.answer === 'boolean') {
    answer = q.answer;
  } else if (typeof q.answer === 'string') {
    answer = q.answer.toLowerCase() === 'true';
  } else {
    answer = Boolean(q.answer);
  }

  return {
    id: globalId,
    marks: DEFAULT_MARKS,
    question: buildQuestionObj(q.question),
    correctAnswer: answer,
    explanation: '',
  };
}

// ── Transformer registry ─────────────────────────────────────
const TRANSFORMERS = {
  fill_blanks: transformFillInBlanks,
  mcq: transformMultipleChoice,
  multi_select: transformMultiSelect,
  match_following: transformMatchTheFollowing,
  ordering: transformReordering,
  true_false: transformTrueFalse,
};

// ── Main export function ─────────────────────────────────────

/**
 * Convert an array of internal questions into the strict export format.
 *
 * @param {Array} questions — flat array from the generation pipeline
 * @returns {Array} — export-ready JSON array grouped by question type
 * @throws {Error} — if input is invalid
 */
function formatForExport(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Invalid question structure detected');
  }

  // Validate each question has the minimum required fields
  for (const q of questions) {
    if (!q || typeof q.question !== 'string' || !q.type) {
      throw new Error('Invalid question structure detected');
    }
    if (!(q.type in TYPE_MAP)) {
      throw new Error(`Invalid question structure detected`);
    }
  }

  // Group by internal type
  const grouped = {};
  for (const q of questions) {
    if (!grouped[q.type]) grouped[q.type] = [];
    grouped[q.type].push(q);
  }

  let globalId = 1;

  const result = Object.entries(grouped).map(([internalType, items]) => {
    const transformer = TRANSFORMERS[internalType];
    const transformedQuestions = items.map((q) => transformer(q, globalId++));
    const totalMarks = transformedQuestions.reduce((sum, tq) => sum + tq.marks, 0);

    return {
      questionType: TYPE_MAP[internalType],
      totalMarks,
      questions: transformedQuestions,
    };
  });

  return result;
}

module.exports = { formatForExport };
