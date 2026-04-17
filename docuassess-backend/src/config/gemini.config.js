const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

if (!process.env.GEMINI_API_KEY) {
  logger.error('[gemini.config] GEMINI_API_KEY is not set in environment variables');
  throw new Error('GEMINI_API_KEY is required');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Returns a configured Gemini generative model instance.
 * @param {string} [modelName]
 */
const getGeminiModel = (modelName) => {
  const finalModel =
    modelName ||
    process.env.GEMINI_MODEL ||
    'gemini-2.5-flash'; // ✅ SAFE DEFAULT

  logger.info(`[gemini.config] Using model: ${finalModel}`);

  return genAI.getGenerativeModel({
    model: finalModel,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
    },
  });
};

module.exports = { getGeminiModel };