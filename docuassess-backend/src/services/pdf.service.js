const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { cleanText, getTextPreview } = require('../utils/textCleaner');
const logger = require('../utils/logger');

/**
 * Extraction result shape:
 * {
 *   success: boolean,
 *   text: string,            // cleaned extracted text (empty string on failure)
 *   pageCount: number,
 *   charCount: number,
 *   warning: string | null,  // non-fatal issues (e.g. very short text)
 *   errorCode: string | null // PARSE_FAILED | EMPTY_TEXT | FILE_NOT_FOUND
 * }
 */

const MIN_MEANINGFUL_TEXT_LENGTH = 50; // below this = likely scanned/image PDF

/**
 * Extracts and cleans text from a PDF file at the given path.
 * @param {string} filePath - Absolute path to the stored PDF
 * @param {string} fileId - For logging correlation
 * @returns {Promise<ExtractionResult>}
 */
const extractText = async (filePath, fileId) => {
  const resolvedPath = path.resolve(filePath);

  // --- Guard: file existence ---
  if (!fs.existsSync(resolvedPath)) {
    logger.error(`[pdf.service] File not found: ${resolvedPath} (fileId: ${fileId})`);
    return {
      success: false,
      text: '',
      pageCount: 0,
      charCount: 0,
      warning: null,
      errorCode: 'FILE_NOT_FOUND',
    };
  }

  let dataBuffer;
  try {
    dataBuffer = fs.readFileSync(resolvedPath);
  } catch (err) {
    logger.error(`[pdf.service] Failed to read file ${resolvedPath}: ${err.message}`);
    return {
      success: false,
      text: '',
      pageCount: 0,
      charCount: 0,
      warning: null,
      errorCode: 'PARSE_FAILED',
    };
  }

  // --- Parse ---
  let parsed;
  try {
    parsed = await pdfParse(dataBuffer, {
      // Disable test-suite file access in pdf-parse
      max: 0,
    });
  } catch (err) {
    logger.error(`[pdf.service] pdf-parse failed for fileId ${fileId}: ${err.message}`);
    return {
      success: false,
      text: '',
      pageCount: 0,
      charCount: 0,
      warning: null,
      errorCode: 'PARSE_FAILED',
    };
  }

  const cleaned = cleanText(parsed.text);
  const pageCount = parsed.numpages || 0;
  const charCount = cleaned.length;

  // --- Guard: empty or near-empty text (scanned/image PDF) ---
  if (charCount < MIN_MEANINGFUL_TEXT_LENGTH) {
    logger.warn(
      `[pdf.service] Extracted text too short (${charCount} chars) for fileId: ${fileId}. ` +
      `Likely a scanned/image-only PDF.`
    );
    return {
      success: false,
      text: cleaned,
      pageCount,
      charCount,
      warning:
        'Extracted text is too short. This PDF may be scanned or image-based and cannot be processed.',
      errorCode: 'EMPTY_TEXT',
    };
  }

  logger.info(
    `[pdf.service] Extraction successful — fileId: ${fileId}, pages: ${pageCount}, chars: ${charCount}`
  );
  logger.debug(`[pdf.service] Text preview — ${getTextPreview(cleaned)}`);

  return {
    success: true,
    text: cleaned,
    pageCount,
    charCount,
    warning: null,
    errorCode: null,
  };
};

module.exports = { extractText };