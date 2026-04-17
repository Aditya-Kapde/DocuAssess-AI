const { ZodError } = require('zod');

/**
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params' | 'file'} [target='body'] - req property to validate
 */
const validateRequest = (schema, target = 'body') => {
  return (req, res, next) => {
    try {
      const data = target === 'file' ? req.file : req[target];
      schema.parse(data);
      next();
    } catch (err) {
        if (err && err.name === 'ZodError') {
            console.log("ZOD ERROR:", err);   // ✅ correct place

            return res.status(400).json({
            success: false,
            error: {
                message: 'Validation failed',
                details: err.errors || err.issues || [],
            },
            });
        }

        next(err);
        }
  };
};

module.exports = validateRequest;