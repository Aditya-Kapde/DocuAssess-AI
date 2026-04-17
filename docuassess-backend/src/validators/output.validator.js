const { z } = require('zod');

/**
 * MCQ: question + 4 options + one answer that must match an option.
 * Superrefine enforces the answer-in-options constraint at schema level.
 */
const mcqSchema = z
  .object({
    question: z.string().min(5, 'MCQ question too short'),
    options: z
      .array(z.string().min(1))
      .min(2, 'MCQ must have at least 2 options')
      .max(6, 'MCQ must not have more than 6 options'),
    answer: z.string().min(1, 'MCQ answer must not be empty'),
  })
  .superRefine((val, ctx) => {
    if (!val.options.includes(val.answer)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answer'],
        message: `Answer "${val.answer}" is not present in options`,
      });
    }
  });

/**
 * True/False: question + boolean answer.
 * Strict boolean — rejects "true" strings, 0/1 integers.
 */
const trueFalseSchema = z.object({
  question: z.string().min(5, 'True/False question too short'),
  answer: z.boolean({ invalid_type_error: 'True/False answer must be a boolean' }),
});

/**
 * Fill in the blank: question must contain '____' as the blank marker.
 */
const fillBlanksSchema = z
  .object({
    question: z.string().min(5),
    answer: z.string().min(1, 'Fill-blank answer must not be empty'),
  })
  .superRefine((val, ctx) => {
    if (!val.question.includes('____')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['question'],
        message: 'Fill-blank question must contain "____" as the blank placeholder',
      });
    }
  });

/**
 * Match the following: parallel left/right arrays + answer mapping.
 * Validates that every left item appears as a key in the answer map.
 */
const matchFollowingSchema = z
  .object({
    left: z.array(z.string().min(1)).min(2),
    right: z.array(z.string().min(1)).min(2),
    answer: z.record(z.string(), z.string()),
  })
  .superRefine((val, ctx) => {
    const missingKeys = val.left.filter((item) => !(item in val.answer));
    if (missingKeys.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answer'],
        message: `Answer map is missing keys for: ${missingKeys.join(', ')}`,
      });
    }
  });

/**
 * Ordering: question + items to order + correct_order.
 * Validates that correct_order is a permutation of items (same elements, different order).
 */
const orderingSchema = z
  .object({
    question: z.string().min(5),
    items: z.array(z.string().min(1)).min(2),
    correct_order: z.array(z.string().min(1)).min(2),
  })
  .superRefine((val, ctx) => {
    const sortedItems = [...val.items].sort();
    const sortedOrder = [...val.correct_order].sort();
    const isPermutation =
      sortedItems.length === sortedOrder.length &&
      sortedItems.every((v, i) => v === sortedOrder[i]);

    if (!isPermutation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correct_order'],
        message: 'correct_order must contain exactly the same elements as items',
      });
    }
  });

/**
 * Multi-select: like MCQ but answers is an array of ≥2 correct options.
 */
const multiSelectSchema = z
  .object({
    question: z.string().min(5),
    options: z.array(z.string().min(1)).min(2).max(6),
    answers: z
      .array(z.string().min(1))
      .min(2, 'Multi-select must have at least 2 correct answers'),
  })
  .superRefine((val, ctx) => {
    const invalidAnswers = val.answers.filter((a) => !val.options.includes(a));
    if (invalidAnswers.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answers'],
        message: `These answers are not in options: ${invalidAnswers.join(', ')}`,
      });
    }
  });

/**
 * Schema registry — keyed by question type string.
 * Add new types here without touching normalizer logic.
 */
const SCHEMA_REGISTRY = {
  mcq: mcqSchema,
  true_false: trueFalseSchema,
  fill_blanks: fillBlanksSchema,
  match_following: matchFollowingSchema,
  ordering: orderingSchema,
  multi_select: multiSelectSchema,
};

module.exports = {
  SCHEMA_REGISTRY,
  mcqSchema,
  trueFalseSchema,
  fillBlanksSchema,
  matchFollowingSchema,
  orderingSchema,
  multiSelectSchema,
};