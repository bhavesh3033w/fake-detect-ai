const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../utils/cloudinary');
const reportController = require('../controllers/reportController');

router.use(protect);

router.post('/analyze', upload.single('image'), reportController.analyzeImage);
router.get('/', reportController.getReports);
router.get('/:id', reportController.getReport);
router.delete('/:id', reportController.deleteReport);

module.exports = router;
