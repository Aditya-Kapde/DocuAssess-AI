const { formatForExport } = require('../utils/exportFormatter');
const logger = require('../utils/logger');

/**
 * POST /api/v1/export
 *
 * Accepts { questions } from the client, transforms them into the
 * strict export schema, and returns a downloadable JSON file.
 */
const exportQuestions = async (req, res) => {
  const { questions } = req.body;

  try {
    const exported = formatForExport(questions);

    const timestamp = Date.now();
    const filename = `questions_${timestamp}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    return res.status(200).send(JSON.stringify(exported, null, 2));
  } catch (err) {
    logger.error(`[export.controller] ${err.message}`);

    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: 'EXPORT_VALIDATION_FAILED',
      },
    });
  }
};

module.exports = { exportQuestions };
