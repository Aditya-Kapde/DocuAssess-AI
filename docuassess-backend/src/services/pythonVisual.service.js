const fs = require('fs');
const path = require('path');
const appConfig = require('../config/app.config');
const logger = require('../utils/logger');

const PYTHON_VISUAL_URL = process.env.PYTHON_VISUAL_URL || 'http://localhost:8000/crop-visuals';
const PYTHON_VISUAL_TIMEOUT_MS = parseInt(process.env.PYTHON_VISUAL_TIMEOUT_MS, 10) || 15000;

let fetchFn = null;
let FormDataConstructor = null;
let BlobConstructor = null;
let formDataPackage = null;
let nodeFetch = null;
let usingFormDataPackage = false;

if (typeof global.fetch === 'function') {
  fetchFn = global.fetch.bind(global);
}

if (typeof global.FormData === 'function') {
  FormDataConstructor = global.FormData;
}

if (typeof global.Blob === 'function') {
  BlobConstructor = global.Blob;
}

try {
  const importedFetch = require('node-fetch');
  nodeFetch = importedFetch.default || importedFetch;
  if (!fetchFn) {
    fetchFn = nodeFetch;
  }
} catch {
  // ignore
}

try {
  formDataPackage = require('form-data');
  if (!FormDataConstructor) {
    FormDataConstructor = formDataPackage;
    usingFormDataPackage = true;
  }
} catch {
  // ignore
}

if (usingFormDataPackage && nodeFetch) {
  fetchFn = nodeFetch;
}

if (!fetchFn || !FormDataConstructor) {
  logger.warn(
    '[pythonVisual.service] No fetch/FormData implementation found. ' +
    'This service requires Node 18+ or node-fetch/form-data installed.'
  );
}

const _createMultipartFormData = async (filePath) => {
  const filename = path.basename(filePath);

  if (FormDataConstructor === formDataPackage) {
    const formData = new FormDataConstructor();
    formData.append('file', fs.createReadStream(filePath));
    return { formData, headers: formData.getHeaders() };
  }

  if (FormDataConstructor && BlobConstructor) {
    const fileBuffer = await fs.promises.readFile(filePath);
    const blob = new BlobConstructor([fileBuffer], { type: 'application/pdf' });
    const formData = new FormDataConstructor();
    formData.append('file', blob, filename);
    return { formData, headers: undefined };
  }

  if (formDataPackage) {
    const formData = new formDataPackage();
    formData.append('file', fs.createReadStream(filePath));
    return { formData, headers: formData.getHeaders() };
  }

  throw new Error('No compatible FormData implementation available');
};

const _ensureOutputDir = (fileId) => {
  const outputDir = path.resolve(appConfig.uploadDir, 'images', fileId);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
};

const _normalizeRelativePath = (filename, fileId) => {
  return path.posix.join('uploads', 'images', fileId, filename);
};

const _copyPythonImage = (sourcePath, fileId) => {
  const absoluteSource = path.resolve(sourcePath);
  if (!fs.existsSync(absoluteSource)) {
    throw new Error(`Python crop file not found: ${absoluteSource}`);
  }

  const outputDir = _ensureOutputDir(fileId);
  const filename = path.basename(absoluteSource);
  const destinationPath = path.join(outputDir, filename);

  if (!fs.existsSync(destinationPath)) {
    fs.copyFileSync(absoluteSource, destinationPath);
  }

  return {
    page: null,
    path: _normalizeRelativePath(filename, fileId),
    absolutePath: destinationPath,
  };
};

const _parseVisuals = (payload, fileId) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Malformed response: expected JSON object');
  }

  const visuals = payload.visuals;
  if (!Array.isArray(visuals)) {
    throw new Error('Malformed response: expected visuals array');
  }

  const images = [];

  visuals.forEach((visual, index) => {
    if (!visual || typeof visual !== 'object') {
      logger.warn(`[pythonVisual.service] Skipping invalid visual element at index ${index}`);
      return;
    }

    const { page_number: pageNumber, image_path: imagePath } = visual;

    if (typeof pageNumber !== 'number' || pageNumber < 1) {
      logger.warn(
        `[pythonVisual.service] Skipping visual with invalid page_number: ${pageNumber}`
      );
      return;
    }

    if (!imagePath || typeof imagePath !== 'string') {
      logger.warn(
        `[pythonVisual.service] Skipping visual with missing image_path on page ${pageNumber}`
      );
      return;
    }

    const filename = path.basename(imagePath);
    if (!filename || !filename.match(/\.(png|jpg|jpeg)$/i)) {
      logger.warn(
        `[pythonVisual.service] Skipping visual with unsupported filename: ${imagePath}`
      );
      return;
    }

    try {
      const copied = _copyPythonImage(imagePath, fileId);
      images.push({
        page: pageNumber,
        path: copied.path,
      });
    } catch (err) {
      logger.warn(
        `[pythonVisual.service] Failed to copy Python visual from ${imagePath}: ${err.message}`
      );
    }
  });

  return images;
};

const fetchVisualImages = async (pdfPath, fileId) => {
  if (!fetchFn || !FormDataConstructor) {
    return {
      success: false,
      images: [],
      error: 'Fetch/FormData unavailable',
    };
  }

  const absolutePdfPath = path.resolve(pdfPath);
  if (!fs.existsSync(absolutePdfPath)) {
    return {
      success: false,
      images: [],
      error: `PDF file does not exist: ${absolutePdfPath}`,
    };
  }

  let formData;
  let headers;
  try {
    const multipart = await _createMultipartFormData(absolutePdfPath);
    formData = multipart.formData;
    headers = multipart.headers;
  } catch (err) {
    logger.warn(`[pythonVisual.service] Failed to build multipart payload: ${err.message}`);
    return {
      success: false,
      images: [],
      error: 'Failed to build multipart payload',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PYTHON_VISUAL_TIMEOUT_MS);

  let response;
  try {
    response = await fetchFn(PYTHON_VISUAL_URL, {
      method: 'POST',
      body: formData,
      headers: headers || undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const message = err.name === 'AbortError' ? 'Python service request timed out' : err.message;
    logger.warn(`[pythonVisual.service] Request failed: ${message}`);
    return {
      success: false,
      images: [],
      error: message,
    };
  }

  clearTimeout(timeout);

  if (!response.ok) {
    const text = await response.text().catch(() => 'unable to read response body');
    logger.warn(
      `[pythonVisual.service] Python service returned status ${response.status}: ${text}`
    );
    return {
      success: false,
      images: [],
      error: `Python service returned ${response.status}`,
    };
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    logger.warn(`[pythonVisual.service] Invalid JSON from Python service: ${err.message}`);
    return {
      success: false,
      images: [],
      error: 'Invalid JSON response from Python service',
    };
  }

  let images;
  try {
    images = _parseVisuals(payload, fileId);
  } catch (err) {
    logger.warn(`[pythonVisual.service] Visual parsing failed: ${err.message}`);
    return {
      success: false,
      images: [],
      error: err.message,
    };
  }

  return {
    success: true,
    images,
  };
};

module.exports = { fetchVisualImages };