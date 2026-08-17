const Groq = require("groq-sdk");
const logger = require("../utils/logger");

if (!process.env.GROQ_API_KEY) {
  logger.error("[groq.config] GROQ_API_KEY is not set in environment variables");
  throw new Error("GROQ_API_KEY is required");
}

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Returns the configured Groq client.
 */
const getGroqClient = () => {
  logger.info(
    `[groq.config] Using model: ${
      process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct"
    }`
  );

  return client;
};

module.exports = {
  getGroqClient,
};