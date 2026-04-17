const { z } = require('zod');
const { QUESTION_TYPE_LABELS } = require('../utils/promptBuilder');

const validQuestionTypes = Object.keys(QUESTION_TYPE_LABELS);

const generateRequestSchema = z.object({
  fileId: z
    .string({ required_error: 'fileId is required' })
    .uuid({ message: 'fileId must be a valid UUID' }),

  questionTypes: z
    .array(z.enum(validQuestionTypes, {
      errorMap: () => ({
        message: `questionTypes must be one of: ${validQuestionTypes.join(', ')}`,
      }),
    }))
    .min(1, 'At least one question type is required')
    .max(6, 'Maximum 6 question types allowed'),

  count: z
    .number({ required_error: 'count is required' })
    .int('count must be an integer')
    .min(1, 'count must be at least 1')
    .max(20, 'count must not exceed 20 per type'),
});

module.exports = { generateRequestSchema };