const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Initialize SendGrid with API key from environment variable
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      logger.info('SendGrid email service initialized');
    } else {
      logger.warn('SENDGRID_API_KEY not found in environment variables');
    }
  }

  /**
   * Send email with PDF attachment
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content
   * @param {string} options.html - HTML content
   * @param {string} options.attachmentPath - Path to PDF attachment
   * @param {string} options.attachmentName - Name for the attachment
   * @returns {Promise<Object>} SendGrid response
   */
  async sendReportEmail(options) {
    try {
      const { to, subject, text, html, attachmentPath, attachmentName } = options;

      // Validate required fields
      if (!to || !subject) {
        throw new Error('Recipient email and subject are required');
      }

      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SendGrid API key is not configured');
      }

      if (!process.env.SENDER_EMAIL) {
        throw new Error('Sender email is not configured');
      }

      const msg = {
        to,
        from: process.env.SENDER_EMAIL,
        subject,
        text: text || 'Please find the attached KPI report.',
        html: html || '<p>Please find the attached KPI report.</p>',
      };

      // Add attachment if provided
      if (attachmentPath) {
        if (!fs.existsSync(attachmentPath)) {
          throw new Error(`Attachment file not found: ${attachmentPath}`);
        }

        const attachment = fs.readFileSync(attachmentPath).toString('base64');
        msg.attachments = [
          {
            content: attachment,
            filename: attachmentName || 'report.pdf',
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ];
      }

      logger.info(`Sending email to: ${to}`);
      const response = await sgMail.send(msg);
      logger.info(`Email sent successfully to: ${to}`);

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        statusCode: response[0].statusCode,
      };
    } catch (error) {
      logger.error(`Email sending failed: ${error.message}`, {
        stack: error.stack,
        recipient: options.to,
      });

      // Handle SendGrid specific errors
      if (error.response) {
        logger.error(`SendGrid error response: ${JSON.stringify(error.response.body)}`);
      }

      throw error;
    }
  }

  /**
   * Send report notification email with formatted HTML
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {Object} options.reportData - Report data for email content
   * @param {string} options.attachmentPath - Path to PDF
   * @returns {Promise<Object>} SendGrid response
   */
  async sendKPIReportNotification(options) {
    try {
      const { to, reportData, attachmentPath } = options;

      const subject = `KPI Dashboard Report - ${reportData.reportId || 'Latest'}`;
      
      const htmlContent = this._generateReportEmailHTML(reportData);
      const textContent = this._generateReportEmailText(reportData);

      return await this.sendReportEmail({
        to,
        subject,
        text: textContent,
        html: htmlContent,
        attachmentPath,
        attachmentName: `KPI_Report_${reportData.reportId || Date.now()}.pdf`,
      });
    } catch (error) {
      logger.error(`Failed to send KPI report notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate HTML content for report email
   * @private
   */
  _generateReportEmailHTML(reportData) {
    const moment = require('moment-timezone');
    const formatDate = (date) => moment(date).tz('Asia/Kolkata').format('DD-MM-YYYY');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .button { background-color: #2c5aa0; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>KPI Dashboard Report</h1>
          </div>
          <div class="content">
            <p>Dear ${reportData.recipientName || 'User'},</p>
            <p>Your requested KPI Dashboard Report is ready. Please find the details below:</p>
            
            <div class="info-row">
              <span class="label">Report ID:</span> ${reportData.reportId || 'N/A'}
            </div>
            <div class="info-row">
              <span class="label">Period:</span> ${formatDate(reportData.startDate)} to ${formatDate(reportData.endDate)}
            </div>
            <div class="info-row">
              <span class="label">Generated On:</span> ${formatDate(new Date())} IST
            </div>
            <div class="info-row">
              <span class="label">Generated By:</span> ${reportData.generatedBy || 'System'}
            </div>
            
            <p style="margin-top: 20px;">The complete report is attached as a PDF document for your review.</p>
            
            <p><strong>Note:</strong> This report contains confidential information and is intended for internal use only.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} KPI Dashboard. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text content for report email
   * @private
   */
  _generateReportEmailText(reportData) {
    const moment = require('moment-timezone');
    const formatDate = (date) => moment(date).tz('Asia/Kolkata').format('DD-MM-YYYY');

    return `
KPI Dashboard Report

Dear ${reportData.recipientName || 'User'},

Your requested KPI Dashboard Report is ready.

Report Details:
- Report ID: ${reportData.reportId || 'N/A'}
- Period: ${formatDate(reportData.startDate)} to ${formatDate(reportData.endDate)}
- Generated On: ${formatDate(new Date())} IST
- Generated By: ${reportData.generatedBy || 'System'}

The complete report is attached as a PDF document for your review.

Note: This report contains confidential information and is intended for internal use only.

---
© ${new Date().getFullYear()} KPI Dashboard. All rights reserved.
This is an automated email. Please do not reply.
    `;
  }

  /**
   * Send bulk reports to multiple recipients
   * @param {Array} recipients - Array of recipient objects with email and reportData
   * @param {string} attachmentPath - Path to PDF
   * @returns {Promise<Array>} Array of results
   */
  async sendBulkReports(recipients, attachmentPath) {
    try {
      logger.info(`Sending bulk reports to ${recipients.length} recipients`);

      const results = await Promise.allSettled(
        recipients.map((recipient) =>
          this.sendKPIReportNotification({
            to: recipient.email,
            reportData: recipient.reportData,
            attachmentPath,
          })
        )
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      logger.info(`Bulk email results - Success: ${successful}, Failed: ${failed}`);

      return results;
    } catch (error) {
      logger.error(`Bulk email sending failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new EmailService();
