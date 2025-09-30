const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pdfReportService = require('../../services/pdfReportService');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');
const { sanitizeReportData } = require('../../validators/reportValidator');

/**
 * Generate PDF report
 * @route POST /api/reports/generate
 * @access Protected (Admin, Manager)
 */
const generatePDFReport = async (req, res) => {
  let pdfPath = null;

  try {
    logger.info('Report generation request received', {
      user: req.user?.email || 'unknown',
      body: req.body,
    });

    // Sanitize input data
    const sanitizedData = sanitizeReportData(req.body);

    // Generate unique report ID if not provided
    if (!sanitizedData.reportId) {
      sanitizedData.reportId = `RPT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    // Add user information to report data
    sanitizedData.generatedBy = req.user?.fullName || req.user?.email || 'System';
    sanitizedData.generatorEmail = req.user?.email;

    // Set default dates if not provided
    if (!sanitizedData.startDate) {
      sanitizedData.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    }
    if (!sanitizedData.endDate) {
      sanitizedData.endDate = new Date();
    }

    // Define output path for PDF
    const reportsDir = path.join(__dirname, '../../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    pdfPath = path.join(reportsDir, `${sanitizedData.reportId}.pdf`);

    // Generate PDF
    logger.info(`Generating PDF report: ${sanitizedData.reportId}`);
    await pdfReportService.generateKPIReport(sanitizedData, pdfPath);

    // Verify PDF was created
    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF file was not created');
    }

    const fileSize = fs.statSync(pdfPath).size;
    logger.info(`PDF generated successfully: ${pdfPath}, Size: ${fileSize} bytes`);

    // Send email if requested
    let emailResult = null;
    if (sanitizedData.sendEmail && sanitizedData.emailRecipients && sanitizedData.emailRecipients.length > 0) {
      try {
        logger.info(`Sending email to ${sanitizedData.emailRecipients.length} recipients`);
        
        const emailPromises = sanitizedData.emailRecipients.map(async (email) => {
          const reportDataWithRecipient = {
            ...sanitizedData,
            recipientName: email.split('@')[0],
          };

          return await emailService.sendKPIReportNotification({
            to: email,
            reportData: reportDataWithRecipient,
            attachmentPath: pdfPath,
          });
        });

        emailResult = await Promise.allSettled(emailPromises);

        const successCount = emailResult.filter((r) => r.status === 'fulfilled').length;
        const failCount = emailResult.filter((r) => r.status === 'rejected').length;

        logger.info(`Email sending completed - Success: ${successCount}, Failed: ${failCount}`);
      } catch (emailError) {
        logger.error(`Email sending failed: ${emailError.message}`);
        // Don't fail the request if email fails
        emailResult = { error: emailError.message };
      }
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      data: {
        reportId: sanitizedData.reportId,
        filePath: pdfPath,
        fileSize: fileSize,
        emailSent: !!emailResult,
        emailRecipients: sanitizedData.emailRecipients || [],
        generatedAt: new Date().toISOString(),
        downloadUrl: `/api/reports/download/${sanitizedData.reportId}`,
      },
    });
  } catch (error) {
    logger.error('Report generation failed', {
      error: error.message,
      stack: error.stack,
      user: req.user?.email,
    });

    // Clean up PDF file if it exists
    if (pdfPath && fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
        logger.info(`Cleaned up partial PDF file: ${pdfPath}`);
      } catch (cleanupError) {
        logger.error(`Failed to clean up PDF file: ${cleanupError.message}`);
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Report Generation Failed',
      message: error.message || 'An error occurred while generating the report',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * Download generated report
 * @route GET /api/reports/download/:reportId
 * @access Protected
 */
const downloadReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    logger.info(`Download request for report: ${reportId}`, {
      user: req.user?.email,
    });

    // Validate reportId
    if (!reportId || !/^[a-zA-Z0-9_-]+$/.test(reportId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Request',
        message: 'Invalid report ID format',
      });
    }

    const reportsDir = path.join(__dirname, '../../../reports');
    const filePath = path.join(reportsDir, `${reportId}.pdf`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.warn(`Report not found: ${reportId}`);
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Report not found or has expired',
      });
    }

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${reportId}.pdf"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      logger.error(`Error streaming file: ${error.message}`);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Download Failed',
          message: 'Error downloading the report',
        });
      }
    });

    logger.info(`Report downloaded successfully: ${reportId}`);
  } catch (error) {
    logger.error('Download failed', {
      error: error.message,
      stack: error.stack,
    });

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Download Failed',
        message: 'An error occurred while downloading the report',
      });
    }
  }
};

/**
 * Send existing report via email
 * @route POST /api/reports/send
 * @access Protected (Admin, Manager)
 */
const sendReportByEmail = async (req, res) => {
  try {
    const { reportId, recipients } = req.body;

    logger.info(`Email send request for report: ${reportId}`, {
      user: req.user?.email,
      recipients,
    });

    // Validate reportId
    if (!reportId || !/^[a-zA-Z0-9_-]+$/.test(reportId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Request',
        message: 'Invalid report ID format',
      });
    }

    const reportsDir = path.join(__dirname, '../../../reports');
    const filePath = path.join(reportsDir, `${reportId}.pdf`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Report not found',
      });
    }

    // Send emails
    const emailPromises = recipients.map(async (email) => {
      return await emailService.sendKPIReportNotification({
        to: email,
        reportData: {
          reportId,
          generatedBy: req.user?.fullName || req.user?.email,
          recipientName: email.split('@')[0],
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
        },
        attachmentPath: filePath,
      });
    });

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.filter((r) => r.status === 'rejected').length;

    logger.info(`Email sending completed - Success: ${successCount}, Failed: ${failCount}`);

    return res.status(200).json({
      success: true,
      message: 'Email sending completed',
      data: {
        reportId,
        totalRecipients: recipients.length,
        successCount,
        failCount,
        results: results.map((r, index) => ({
          email: recipients[index],
          status: r.status,
          error: r.status === 'rejected' ? r.reason.message : null,
        })),
      },
    });
  } catch (error) {
    logger.error('Email sending failed', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Email Send Failed',
      message: error.message || 'An error occurred while sending emails',
    });
  }
};

/**
 * List all generated reports
 * @route GET /api/reports/list
 * @access Protected
 */
const listReports = async (req, res) => {
  try {
    logger.info('List reports request', { user: req.user?.email });

    const reportsDir = path.join(__dirname, '../../../reports');

    // Check if reports directory exists
    if (!fs.existsSync(reportsDir)) {
      return res.status(200).json({
        success: true,
        message: 'No reports found',
        data: {
          reports: [],
          count: 0,
        },
      });
    }

    // Read all PDF files in reports directory
    const files = fs.readdirSync(reportsDir).filter((file) => file.endsWith('.pdf'));

    const reports = files.map((file) => {
      const filePath = path.join(reportsDir, file);
      const stats = fs.statSync(filePath);

      return {
        reportId: file.replace('.pdf', ''),
        fileName: file,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        downloadUrl: `/api/reports/download/${file.replace('.pdf', '')}`,
      };
    });

    // Sort by creation date (newest first)
    reports.sort((a, b) => b.createdAt - a.createdAt);

    logger.info(`Listed ${reports.length} reports`);

    return res.status(200).json({
      success: true,
      message: 'Reports retrieved successfully',
      data: {
        reports,
        count: reports.length,
      },
    });
  } catch (error) {
    logger.error('List reports failed', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'List Failed',
      message: 'An error occurred while retrieving reports',
    });
  }
};

/**
 * Delete a report
 * @route DELETE /api/reports/:reportId
 * @access Protected (Admin only)
 */
const deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    logger.info(`Delete request for report: ${reportId}`, {
      user: req.user?.email,
    });

    // Validate reportId
    if (!reportId || !/^[a-zA-Z0-9_-]+$/.test(reportId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Request',
        message: 'Invalid report ID format',
      });
    }

    const reportsDir = path.join(__dirname, '../../../reports');
    const filePath = path.join(reportsDir, `${reportId}.pdf`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Report not found',
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);
    logger.info(`Report deleted successfully: ${reportId}`);

    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
      data: {
        reportId,
      },
    });
  } catch (error) {
    logger.error('Delete report failed', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Delete Failed',
      message: 'An error occurred while deleting the report',
    });
  }
};

module.exports = {
  generatePDFReport,
  downloadReport,
  sendReportByEmail,
  listReports,
  deleteReport,
};
