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