const { generateQuestions } = require('../services/generate.service');
const logger = require('../utils/logger');

const ERROR_STATUS_MAP = {
  CHUNKS_NOT_FOUND: 404,
  API_CALL_FAILED: 502,
  RETRY_API_CALL_FAILED: 502,
  PARSE_FAILED: 422,
};

/**
 * POST /api/v1/generate
 */
const generate = async (req, res, next) => {
  console.log("REQ BODY:", req.body); // debug (can remove later)

  const { fileId, questionTypes, count } = req.body; // ✅ UPDATED

  try {
    const result = await generateQuestions({
      fileId,
      questionTypes,
      count,
    });

    if (!result.success) {
      const status = ERROR_STATUS_MAP[result.errorCode] || 500;
      return res.status(status).json({
        success: false,
        error: { message: result.error, code: result.errorCode },
        meta: result.meta,
      });
    }

    return res.status(200).json({
      success: true,
      questions: result.questions,
      meta: result.meta,
    });

  } catch (err) {
    const status = err.status || 500;
    logger.error(`[generate.controller] ${err.message}`);

    return res.status(status).json({
      success: false,
      error: {
        message: err.message,
        code: err.errorCode || 'INTERNAL_ERROR',
      },
    });
  }
};

module.exports = { generate };