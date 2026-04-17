const { z } = require('zod');

const uploadedFileSchema = z.object({
  fieldname: z.string(),
  originalname: z.string().endsWith('.pdf', {
    message: 'Uploaded file must be a PDF',
  }),
  mimetype: z.literal('application/pdf', {
    errorMap: () => ({ message: 'MIME type must be application/pdf' }),
  }),
  size: z.number().positive(),
  filename: z.string(),
  path: z.string(),
});

module.exports = { uploadedFileSchema };