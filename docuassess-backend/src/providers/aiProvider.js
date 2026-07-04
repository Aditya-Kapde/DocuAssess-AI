const logger = require("../utils/logger");

const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

logger.info(`[aiProvider] Active provider: ${provider}`);

let gemini = null;
let groq = null;

if (provider === "gemini") {
    gemini = require("../config/gemini.config");
}

if (provider === "groq") {
    groq = require("../config/groq.config");
}

const TEXT_MODEL =
    process.env.GEMINI_MODEL ||
    process.env.GROQ_MODEL;

const IMAGE_ANALYSIS_PROMPT = `
Analyze this image and return STRICT JSON:

{
  "type":"diagram | graph | equation | chemical | figure",
  "concepts":["..."],
  "description":"...",
  "labels":["..."],
  "questionHints":["..."]
}

Return ONLY JSON.
`.trim();

/**
 * Generates text from the configured provider.
 */
async function generateText(prompt) {

    if (provider === "gemini") {

        const model = gemini.getGeminiModel(TEXT_MODEL);

        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ]
        });

        return result.response.text();
    }

    if (provider === "groq") {

        const client = groq.getGroqClient();

        const completion =
            await client.chat.completions.create({

                model: process.env.GROQ_MODEL,

                temperature: 0.2,

                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });

        return completion.choices[0].message.content;
    }

    throw new Error(`Unsupported AI provider: ${provider}`);
}

/**
 * Image analysis.
 */
async function analyzeImage(base64Image, mimeType = "image/png") {

    if (provider === "gemini") {

        const model = gemini.getGeminiModel(TEXT_MODEL);

        const result = await model.generateContent({

            contents: [

                {

                    role: "user",

                    parts: [

                        {

                            inlineData: {

                                mimeType,

                                data: base64Image

                            }

                        },

                        {

                            text: IMAGE_ANALYSIS_PROMPT

                        }

                    ]

                }

            ]

        });

        return result.response.text();
    }

    if (provider === "groq") {

        const client = groq.getGroqClient();

        const completion =
            await client.chat.completions.create({

                model: process.env.GROQ_MODEL,

                temperature: 0.2,

                messages: [

                    {

                        role: "user",

                        content: [

                            {

                                type: "image_url",

                                image_url: {

                                    url: `data:${mimeType};base64,${base64Image}`

                                }

                            },

                            {

                                type: "text",

                                text: IMAGE_ANALYSIS_PROMPT

                            }

                        ]

                    }

                ]

            });

        return completion.choices[0].message.content;
    }

    throw new Error(`Unsupported AI provider: ${provider}`);
}

module.exports = {

    generateText,

    analyzeImage

};