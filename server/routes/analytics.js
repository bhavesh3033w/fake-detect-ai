const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Report = require('../models/Report');

router.use(protect);

router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user._id;

    const [total, fake, real, suspicious] = await Promise.all([
      Report.countDocuments({ userId, isDeleted: false }),
      Report.countDocuments({ userId, result: 'fake', isDeleted: false }),
      Report.countDocuments({ userId, result: 'real', isDeleted: false }),
      Report.countDocuments({ userId, result: 'suspicious', isDeleted: false }),
    ]);

    // Weekly activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyData = await Report.aggregate([
      {
        $match: {
          userId,
          isDeleted: false,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            result: '$result',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Screenshot types breakdown
    const typeBreakdown = await Report.aggregate([
      { $match: { userId, isDeleted: false } },
      { $group: { _id: '$screenshotType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Average confidence
    const avgConfidence = await Report.aggregate([
      { $match: { userId, isDeleted: false } },
      { $group: { _id: null, avg: { $avg: '$confidence' } } },
    ]);

    // Recent reports
    const recentReports = await Report.find({ userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('imageUrl result confidence screenshotType createdAt');

    const accuracy = total > 0 ? Math.round(((real + suspicious * 0.5) / total) * 100) : 0;

    res.json({
      success: true,
      stats: {
        total,
        fake,
        real,
        suspicious,
        accuracy,
        avgConfidence: avgConfidence[0]?.avg ? Math.round(avgConfidence[0].avg) : 0,
      },
      weeklyData,
      typeBreakdown,
      recentReports,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
