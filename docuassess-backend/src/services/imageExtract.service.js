const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');
const appConfig = require('../config/app.config');

const execFileAsync = promisify(execFile);

/**
 * Image extraction result shape:
 * {
 *   success: boolean,
 *   images: Array<{ page: number, path: string }>,
 *   pageCount: number,
 *   warning: string | null,
 *   errorCode: string | null  // FILE_NOT_FOUND | EXTRACTION_FAILED | NO_IMAGES | POPPLER_NOT_FOUND
 * }
 */

/**
 * Base directory where extracted images are stored.
 * Final layout: <uploadDir>/images/<fileId>/page-1.png, page-2.png, …
 */
const IMAGES_BASE_DIR = path.resolve(appConfig.uploadDir, 'images');

/**
 * Ensures the output directory exists for a given fileId.
 * @param {string} fileId
 * @returns {string} Absolute path to the file-specific image directory
 */
const _ensureOutputDir = (fileId) => {
  const outputDir = path.join(IMAGES_BASE_DIR, fileId);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    logger.debug(`[imageExtract.service] Created output dir: ${outputDir}`);
  }
  return outputDir;
};

/**
 * Collects generated PNG files from the output directory and returns
 * a sorted, structured list with 1-based page numbers.
 *
 * pdftoppm names files as: <prefix>-<page>.png  (e.g. page-1.png, page-02.png)
 * We normalise them to a consistent page-X.png naming.
 *
 * @param {string} outputDir - Directory containing generated PNGs
 * @returns {Array<{ page: number, path: string }>}
 */
const _collectImages = (outputDir) => {
  const files = fs.readdirSync(outputDir).filter((f) => f.endsWith('.png'));

  if (files.length === 0) return [];

  // pdftoppm produces files like "page-01.png" or "page-1.png"
  // Sort numerically by the page number embedded in the filename
  const sorted = files
    .map((filename) => {
      const match = filename.match(/page-0*(\d+)\.png$/);
      const pageNum = match ? parseInt(match[1], 10) : 0;
      return { filename, pageNum };
    })
    .filter(({ pageNum }) => pageNum > 0)
    .sort((a, b) => a.pageNum - b.pageNum);

  return sorted.map(({ filename, pageNum }) => {
    const absPath = path.join(outputDir, filename);

    // Normalise to consistent page-X.png if pdftoppm used zero-padding
    const canonicalName = `page-${pageNum}.png`;
    const canonicalPath = path.join(outputDir, canonicalName);

    if (filename !== canonicalName) {
      fs.renameSync(absPath, canonicalPath);
      logger.debug(
        `[imageExtract.service] Renamed ${filename} → ${canonicalName}`
      );
    }

    return {
      page: pageNum,
      path: canonicalPath,
    };
  });
};

/**
 * Extracts images from a PDF by rendering each page to PNG using
 * Poppler's pdftoppm command-line tool.
 *
 * @param {string} filePath - Absolute path to the source PDF file
 * @param {string} fileId   - Unique file identifier (used for output dir + logging)
 * @returns {Promise<{
 *   success: boolean,
 *   images: Array<{ page: number, path: string }>,
 *   pageCount: number,
 *   warning: string | null,
 *   errorCode: string | null
 * }>}
 */
const extractImagesFromPdf = async (filePath, fileId) => {
  const resolvedPath = path.resolve(filePath);

  // --- Guard: file existence ---
  if (!fs.existsSync(resolvedPath)) {
    logger.error(
      `[imageExtract.service] File not found: ${resolvedPath} (fileId: ${fileId})`
    );
    return {
      success: false,
      images: [],
      pageCount: 0,
      warning: null,
      errorCode: 'FILE_NOT_FOUND',
    };
  }

  // --- Prepare output directory ---
  const outputDir = _ensureOutputDir(fileId);
  const outputPrefix = path.join(outputDir, 'page');

  // --- Run pdftoppm ---
  try {
    await execFileAsync('pdftoppm', [
      '-png',        // output format
      '-r', '150',   // DPI — balanced quality vs. file size
      resolvedPath,  // input PDF
      outputPrefix,  // output prefix: <dir>/page  →  page-1.png, page-2.png …
    ]);
  } catch (err) {
    // Distinguish "pdftoppm not installed" from other errors
    const isNotFound =
      err.code === 'ENOENT' ||
      (err.message && err.message.includes('ENOENT'));

    if (isNotFound) {
      logger.error(
        `[imageExtract.service] pdftoppm not found on PATH. ` +
        `Install Poppler utilities to enable image extraction. (fileId: ${fileId})`
      );
      return {
        success: false,
        images: [],
        pageCount: 0,
        warning: 'pdftoppm (Poppler) is not installed or not on PATH.',
        errorCode: 'POPPLER_NOT_FOUND',
      };
    }

    logger.error(
      `[imageExtract.service] pdftoppm failed for fileId ${fileId}: ${err.message}`
    );
    return {
      success: false,
      images: [],
      pageCount: 0,
      warning: null,
      errorCode: 'EXTRACTION_FAILED',
    };
  }

  // --- Collect results ---
  const images = _collectImages(outputDir);

  if (images.length === 0) {
    logger.warn(
      `[imageExtract.service] pdftoppm produced no images for fileId: ${fileId}. ` +
      `The PDF may be empty or corrupted.`
    );
    return {
      success: false,
      images: [],
      pageCount: 0,
      warning: 'No images were generated. The PDF may be empty or corrupted.',
      errorCode: 'NO_IMAGES',
    };
  }

  const pageCount = images.length;

  logger.info(
    `[imageExtract.service] Extraction successful — fileId: ${fileId}, pages: ${pageCount}`
  );

  return {
    success: true,
    images,
    pageCount,
    warning: null,
    errorCode: null,
  };
};

module.exports = { extractImagesFromPdf };
