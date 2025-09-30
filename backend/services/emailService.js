const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendReportEmail = async (to, reportBuffer) => {
  const msg = {
    to,
    from: 'reports@kpidashboard.com', // Use a verified sender email
    subject: 'Your KPI Report is Ready',
    text: 'Please find your attached KPI report.',
    attachments: [
      {
        content: reportBuffer.toString('base64'),
        filename: 'kpi-report.pdf',
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ],
  };

  try {
    await sgMail.send(msg);
    console.log('Report email sent successfully.');
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send report email.');
  }
};

module.exports = { sendReportEmail };
