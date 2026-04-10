const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

router.use(protect);

router.post('/analyze', reportController.analyzeImage);
router.get('/', reportController.getReports);
router.get('/:id', reportController.getReport);
router.delete('/:id', reportController.deleteReport);

module.exports = router;