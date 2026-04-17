const { v4: uuidv4 } = require('uuid');

/**
 * Counts words in a string.
 * @param {string} text
 * @returns {number}
 */
const countWords = (text) => {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

/**
 * Splits cleaned text into paragraphs on blank lines.
 * Filters out empty or whitespace-only paragraphs.
 * @param {string} text - Cleaned text from pdf.service
 * @returns {string[]}
 */
const splitIntoParagraphs = (text) => {
  if (!text || typeof text !== 'string') return [];

  return text
    .split(/\n{2,}/)                          // split on blank lines
    .map((p) => p.replace(/\n/g, ' ').trim()) // flatten internal newlines
    .filter((p) => p.length > 0 && countWords(p) > 0);
};

/**
 * Groups paragraphs into chunks, each capped at maxWordsPerChunk.
 * Never breaks a paragraph across two chunks.
 * A single paragraph exceeding maxWordsPerChunk becomes its own chunk.
 *
 * @param {string[]} paragraphs
 * @param {number} maxWordsPerChunk
 * @returns {{ chunkId: string, index: number, content: string, wordCount: number }[]}
 */
const buildChunks = (paragraphs, maxWordsPerChunk) => {
  if (!paragraphs || paragraphs.length === 0) return [];

  const chunks = [];
  let currentParagraphs = [];
  let currentWordCount = 0;
  let chunkIndex = 0;

  const flushChunk = () => {
    if (currentParagraphs.length === 0) return;

    const content = currentParagraphs.join('\n\n').trim();
    const wordCount = countWords(content);

    if (wordCount > 0) {
      chunks.push({
        chunkId: uuidv4(),
        index: chunkIndex++,
        content,
        wordCount,
      });
    }

    currentParagraphs = [];
    currentWordCount = 0;
  };

  for (const paragraph of paragraphs) {
    const paraWordCount = countWords(paragraph);

    // Edge case: single paragraph exceeds limit → flush current, emit alone
    if (paraWordCount > maxWordsPerChunk) {
      flushChunk();
      chunks.push({
        chunkId: uuidv4(),
        index: chunkIndex++,
        content: paragraph.trim(),
        wordCount: paraWordCount,
      });
      continue;
    }

    // Adding this paragraph would exceed limit → flush first
    if (currentWordCount + paraWordCount > maxWordsPerChunk && currentParagraphs.length > 0) {
      flushChunk();
    }

    currentParagraphs.push(paragraph);
    currentWordCount += paraWordCount;
  }

  // Flush any remaining paragraphs
  flushChunk();

  return chunks;
};

/**
 * Computes average word count across all chunks.
 * @param {{ wordCount: number }[]} chunks
 * @returns {number}
 */
const getAverageChunkSize = (chunks) => {
  if (!chunks || chunks.length === 0) return 0;
  const total = chunks.reduce((sum, c) => sum + c.wordCount, 0);
  return Math.round(total / chunks.length);
};

module.exports = { splitIntoParagraphs, buildChunks, countWords, getAverageChunkSize };