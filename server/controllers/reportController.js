const Report = require('../models/Report');
const User = require('../models/User');
const { analyzeImage } = require('../utils/detector');
const { uploadBase64, deleteImage } = require('../utils/cloudinary');

exports.analyzeImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const imageUrl = req.file.path;
    const publicId = req.file.filename;

    const metadata = {
      width: req.file.width,
      height: req.file.height,
      format: req.file.format || req.file.mimetype?.split('/')[1],
      size: req.file.size,
      hasExif: false,
    };

    // Run detection engine
    const analysisResult = await analyzeImage(imageUrl, metadata);

    // Upload heatmap to Cloudinary if generated
    let heatmapUrl = null;
    if (analysisResult.heatmapBase64) {
      try {
        const heatmapUpload = await uploadBase64(analysisResult.heatmapBase64, 'fakedetect/heatmaps');
        heatmapUrl = heatmapUpload.secure_url;
      } catch (e) {
        console.error('Heatmap upload failed:', e.message);
      }
    }

    // Save report to database
    const report = await Report.create({
      userId: req.user._id,
      imageUrl,
      publicId,
      heatmapUrl,
      result: analysisResult.result,
      confidence: analysisResult.confidence,
      reasons: analysisResult.reasons,
      screenshotType: analysisResult.screenshotType,
      metadata: {
        ...metadata,
        colorProfile: 'sRGB',
        compressionLevel: metadata.size < 100000 ? 'high' : metadata.size < 500000 ? 'medium' : 'low',
      },
      analysisLevels: analysisResult.analysisLevels,
      ocrText: analysisResult.ocrText,
      ocrFindings: analysisResult.ocrFindings,
      processingTime: analysisResult.processingTime,
    });

    // Update user's total analyses count
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalAnalyses: 1 } });

    res.status(201).json({
      success: true,
      report: {
        id: report._id,
        imageUrl: report.imageUrl,
        heatmapUrl: report.heatmapUrl,
        result: report.result,
        confidence: report.confidence,
        reasons: report.reasons,
        screenshotType: report.screenshotType,
        metadata: report.metadata,
        analysisLevels: report.analysisLevels,
        ocrText: report.ocrText,
        ocrFindings: report.ocrFindings,
        processingTime: report.processingTime,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, filter, search } = req.query;
    const query = { userId: req.user._id, isDeleted: false };

    if (filter && ['real', 'suspicious', 'fake'].includes(filter)) {
      query.result = filter;
    }

    const total = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-ocrText -analysisLevels');

    res.json({
      success: true,
      reports,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getReport = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false,
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Soft delete
    report.isDeleted = true;
    await report.save();

    // Optionally delete from Cloudinary
    if (report.publicId) {
      try {
        await deleteImage(report.publicId);
      } catch (e) {
        console.error('Cloudinary delete failed:', e.message);
      }
    }

    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
