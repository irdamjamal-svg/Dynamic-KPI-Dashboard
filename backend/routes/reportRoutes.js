const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

// @route   POST /api/reports/generate
// @desc    Generate a KPI report
// @access  Private (requires authentication and authorization)
router.post('/generate', protect(['admin', 'manager']), reportController.generateReport);

module.exports = router;
