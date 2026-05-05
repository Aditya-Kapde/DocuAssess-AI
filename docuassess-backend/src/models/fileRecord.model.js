const mongoose = require('mongoose');

const chunkSubSchema = new mongoose.Schema(
  {
    chunkId:   { type: String, required: true },
    index:     { type: Number, required: true },
    content:   { type: String, required: true },
    wordCount: { type: Number, required: true },
  },
  { _id: false } // no separate _id per chunk — chunkId is sufficient
);

/**
 * Sub-schema for images extracted from PDF pages.
 *
 * @property {Number}   page                - 1-based page number the image was found on
 * @property {String}   path                - relative or absolute path to the extracted image file
 * @property {Date}     extractedAt         - timestamp when the image was extracted
 * @property {Object}   [metadata]          - optional AI-derived metadata
 * @property {String}   [metadata.type]     - image type (e.g. 'chart', 'photo', 'diagram')
 * @property {String[]} [metadata.concepts] - key concepts identified in the image
 * @property {String}   [metadata.description] - brief description of the image content
 */
const imageSubSchema = new mongoose.Schema(
  {
    page:        { type: Number, required: true },
    path:        { type: String, required: true },
    extractedAt: { type: Date,   default: Date.now },
    metadata: {
      type: {
        type:        String,
      },
      concepts:    { type: [String], default: [] },
      description: { type: String,   default: null },
    },
  },
  { _id: false }
);

const fileRecordSchema = new mongoose.Schema(
  {
    fileId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    originalName: { type: String, required: true },
    storedName:   { type: String, required: true },
    filePath:     { type: String, required: true },
    sizeMb:       { type: Number, required: true },
    uploadedAt:   { type: Date,   default: Date.now },

    // Extraction results (populated after pdf.service)
    pageCount:  { type: Number, default: 0 },
    charCount:  { type: Number, default: 0 },

    // Chunking results (populated after chunk.service)
    chunks:     { type: [chunkSubSchema], default: [] },
    chunkCount: { type: Number, default: 0 },

    // Extracted images (populated after image extraction, if applicable)
    images: { type: [imageSubSchema], default: [] },

    // Pipeline status
    status: {
      type:    String,
      enum:    ['uploaded', 'processed', 'failed'],
      default: 'uploaded',
    },
    error: { type: String, default: null },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
    versionKey: false,
  }
);

const FileRecord = mongoose.model('FileRecord', fileRecordSchema);

module.exports = FileRecord;