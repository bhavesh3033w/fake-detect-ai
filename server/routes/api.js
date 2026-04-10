const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/auth');
const { upload } = require('../utils/cloudinary');
const { analyzeImage } = require('../utils/detector');

// Public API - requires API key in x-api-key header
router.post('/', apiKeyAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const metadata = {
      width: req.file.width,
      height: req.file.height,
      format: req.file.mimetype?.split('/')[1],
      size: req.file.size,
    };

    const result = await analyzeImage(req.file.path, metadata);

    res.json({
      success: true,
      api_version: 'v1',
      result: result.result,
      confidence: result.confidence,
      reasons: result.reasons,
      screenshot_type: result.screenshotType,
      processing_time_ms: result.processingTime,
      levels: {
        metadata_score: result.analysisLevels.level1.score,
        pixel_score: result.analysisLevels.level2.score,
        ai_score: result.analysisLevels.level3.score,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
