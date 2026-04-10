const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
    },
    heatmapUrl: {
      type: String,
      default: null,
    },
    publicId: {
      type: String, // Cloudinary public ID
    },
    result: {
      type: String,
      enum: ['real', 'suspicious', 'fake'],
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    reasons: [
      {
        type: String,
      },
    ],
    screenshotType: {
      type: String,
      enum: ['whatsapp', 'upi_payment', 'instagram_dm', 'email', 'unknown', 'other'],
      default: 'unknown',
    },
    metadata: {
      width: Number,
      height: Number,
      format: String,
      size: Number, // in bytes
      hasExif: Boolean,
      exifData: mongoose.Schema.Types.Mixed,
      compressionLevel: String,
      colorProfile: String,
    },
    analysisLevels: {
      level1: {
        score: Number,
        findings: [String],
      },
      level2: {
        score: Number,
        findings: [String],
      },
      level3: {
        score: Number,
        findings: [String],
      },
    },
    ocrText: {
      type: String,
      default: null,
    },
    ocrFindings: [String],
    processingTime: Number, // milliseconds
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for faster queries
reportSchema.index({ userId: 1, createdAt: -1 });
reportSchema.index({ result: 1 });
reportSchema.index({ userId: 1, result: 1 });

module.exports = mongoose.model('Report', reportSchema);
