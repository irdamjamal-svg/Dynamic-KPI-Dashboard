const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

async function sendReportEmail({ to, subject, text, html, attachmentBuffer, filename = 'KPI_Report.pdf' }) {
  if (!apiKey) {
    logger.warn('SENDGRID_API_KEY not set. Skipping email send.');
    return { skipped: true };
  }
  const from = process.env.SENDGRID_FROM || 'no-reply@example.com';
  const msg = {
    to,
    from,
    subject: subject || 'Your KPI Report',
    text: text || 'Please find the attached KPI report.',
    html: html || '<p>Please find the attached KPI report.</p>',
    attachments: attachmentBuffer
      ? [
          {
            content: attachmentBuffer.toString('base64'),
            filename,
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ]
      : [],
  };
  try {
    await sgMail.send(msg);
    logger.info('Report email sent', { to });
    return { sent: true };
  } catch (err) {
    logger.error('Failed to send report email', { error: err.message });
    throw err;
  }
}

module.exports = {
  sendReportEmail,
};
