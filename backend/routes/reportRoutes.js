const express = require('express');
const router = express.Router();
const {
  generatePDFReport,
  downloadReport,
  sendReportByEmail,
  listReports,
  deleteReport,
} = require('../controller/Reports/reportController');
const {
  isAuthenticated,
  isAdmin,
  isManagerOrAdmin,
} = require('../middleware/authMiddleware');
const {
  validateRequest,
  reportGenerationSchema,
  emailSendSchema,
} = require('../validators/reportValidator');

/**
 * @route   POST /api/reports/generate
 * @desc    Generate a new PDF report
 * @access  Protected (Manager, Admin)
 */
router.post(
  '/generate',
  isAuthenticated,
  isManagerOrAdmin,
  validateRequest(reportGenerationSchema),
  generatePDFReport
);

/**
 * @route   GET /api/reports/download/:reportId
 * @desc    Download a generated report
 * @access  Protected
 */
router.get('/download/:reportId', isAuthenticated, downloadReport);

/**
 * @route   POST /api/reports/send
 * @desc    Send existing report via email
 * @access  Protected (Manager, Admin)
 */
router.post(
  '/send',
  isAuthenticated,
  isManagerOrAdmin,
  validateRequest(emailSendSchema),
  sendReportByEmail
);

/**
 * @route   GET /api/reports/list
 * @desc    List all generated reports
 * @access  Protected
 */
router.get('/list', isAuthenticated, listReports);

/**
 * @route   DELETE /api/reports/:reportId
 * @desc    Delete a report
 * @access  Protected (Admin only)
 */
router.delete('/:reportId', isAuthenticated, isAdmin, deleteReport);

module.exports = router;
