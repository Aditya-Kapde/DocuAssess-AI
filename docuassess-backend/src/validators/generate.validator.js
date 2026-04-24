const { z } = require('zod');
const { QUESTION_TYPE_LABELS } = require('../utils/promptBuilder');

const validQuestionTypes = Object.keys(QUESTION_TYPE_LABELS);

/**
 * Single source of truth for the maximum number of questions allowed per type.
 * Update this value to change the limit everywhere.
 */
const MAX_QUESTIONS_PER_TYPE = 20;

const generateRequestSchema = z.object({
  fileId: z
    .string({ required_error: 'fileId is required' })
    .uuid({ message: 'fileId must be a valid UUID' }),

  questionConfig: z
    .record(
      z.string(),
      z
        .number({ invalid_type_error: 'Each count must be a number' })
        .int('Each count must be an integer')
        .min(0, 'Count must be at least 0')
        .max(MAX_QUESTIONS_PER_TYPE, `Count must not exceed ${MAX_QUESTIONS_PER_TYPE}`)
    )
    .refine(
      (obj) => Object.keys(obj).length >= 1,
      'At least one question type is required'
    )
    .refine(
      (obj) => Object.keys(obj).length <= 6,
      'Maximum 6 question types allowed'
    )
    .refine(
      (obj) => Object.keys(obj).every((key) => validQuestionTypes.includes(key)),
      {
        message: `questionConfig keys must be one of: ${validQuestionTypes.join(', ')}`,
      }
    ),
});

module.exports = { generateRequestSchema, MAX_QUESTIONS_PER_TYPE };