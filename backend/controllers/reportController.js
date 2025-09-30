const { generatePdf } = require('../services/pdfService');
const { sendReportEmail } = require('../services/emailService');
const { reportRequestSchema } = require('../utils/validators');
const logger = require('../config/logger');
require('jspdf-autotable');

exports.generateReport = async (req, res) => {
  try {
    // Mock data for the report
    const kpiData = {
      title: 'Quarterly KPI Report',
      period: 'Q3 2024',
      generatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      data: [
        { metric: 'Sales Growth', value: '15%', target: '10%' },
        { metric: 'Customer Satisfaction', value: '92%', target: '90%' },
        { metric: 'Net Promoter Score', value: '45', target: '40' },
        { metric: 'Revenue', value: '₹5,00,00,000', target: '₹4,50,00,000' },
      ],
    };

    const { error } = reportRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email } = req.body;

    const pdfBuffer = generatePdf(kpiData);

    await sendReportEmail(email, Buffer.from(pdfBuffer));

    logger.info(`Report generated and sent to ${email} by user ${req.user.id}`);
    res.status(200).json({ message: 'Report successfully generated and sent.' });

  } catch (error) {
    logger.error(`Error generating report for user ${req.user.id}: ${error.message}`);
    res.status(500).json({ message: 'Failed to generate report.' });
  }
};
