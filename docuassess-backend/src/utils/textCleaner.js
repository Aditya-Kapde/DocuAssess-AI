/**
 * Normalizes raw PDF-extracted text for downstream processing.
 * @param {string} raw - Raw string from pdf-parse
 * @returns {string} Cleaned, normalized text
 */
const cleanText = (raw) => {
  if (!raw || typeof raw !== 'string') return '';

  return raw
    // Normalize all line endings to \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

    // Remove non-printable / control characters (except \n and \t)
    .replace(/[^\x09\x0A\x20-\x7E\u00A0-\uFFFF]/g, ' ')

    // Collapse 3+ consecutive newlines into 2 (preserve paragraph breaks)
    .replace(/\n{3,}/g, '\n\n')

    // Collapse multiple spaces/tabs on a single line into one space
    .replace(/[ \t]{2,}/g, ' ')

    // Trim leading/trailing whitespace per line
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')

    // Final trim
    .trim();
};

/**
 * Returns a short preview of text for logging (avoids flooding logs).
 * @param {string} text
 * @param {number} [maxChars=300]
 * @returns {string}
 */
const getTextPreview = (text, maxChars = 300) => {
  if (!text) return '[empty]';
  return text.length <= maxChars
    ? text
    : `${text.slice(0, maxChars)}... [truncated, total: ${text.length} chars]`;
};

module.exports = { cleanText, getTextPreview };