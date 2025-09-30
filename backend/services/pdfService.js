const PDFDocument = require('pdfkit');
const { formatINR, formatIST } = require('../utils/format');

function drawHeader(doc, title, generatedBy) {
  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(title || 'KPI Report', { align: 'left' });
  doc.moveUp(1).font('Helvetica').fontSize(10).text(`Generated: ${formatIST(new Date())}`, { align: 'right' });
  if (generatedBy) {
    doc.font('Helvetica').fontSize(10).text(`By: ${generatedBy}`, { align: 'right' });
  }
  doc.moveDown().strokeColor('#aaaaaa').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();
}

function drawKeyValue(doc, key, value) {
  doc.font('Helvetica').fontSize(12).text(`${key}: `, { continued: true }).font('Helvetica-Bold').text(String(value));
}

function drawSectionTitle(doc, title) {
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(14).text(title);
  doc.moveDown(0.2).strokeColor('#cccccc').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.2);
}

function drawList(doc, items) {
  if (!Array.isArray(items) || items.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(11).text('- none -');
    return;
  }
  items.forEach((line) => {
    doc.font('Helvetica').fontSize(11).text(`• ${line}`);
  });
}

function generateKPIReportPDF({ title, metrics, filters, generatedBy }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, title, generatedBy);

    drawSectionTitle(doc, 'Summary');
    drawKeyValue(doc, 'Total Customers', metrics.totalCustomers ?? 0);
    drawKeyValue(doc, 'Total Revenue', formatINR(metrics.totalRevenue ?? 0));
    drawKeyValue(doc, 'Open Deals', metrics.openDeals ?? 0);
    drawKeyValue(doc, 'Messages', metrics.totalMessages ?? 0);
    drawKeyValue(doc, 'Open Tasks', metrics.totalTasks ?? 0);
    drawKeyValue(doc, 'Tasks Due (7 days)', metrics.tasksDueSoon ?? 0);

    drawSectionTitle(doc, 'Customers by Status');
    const statusLines = Object.entries(metrics.customersByStatus || {}).map(
      ([k, v]) => `${k}: ${v}`
    );
    drawList(doc, statusLines);

    if (Array.isArray(metrics.topCustomers) && metrics.topCustomers.length > 0) {
      drawSectionTitle(doc, 'Top Customers (by Amount)');
      drawList(
        doc,
        metrics.topCustomers.map((c) => `${c.name || c.company || 'N/A'} - ${formatINR(c.amount || 0)}`)
      );
    }

    if (filters) {
      drawSectionTitle(doc, 'Filters');
      if (filters.fromDate) drawKeyValue(doc, 'From', formatIST(filters.fromDate));
      if (filters.toDate) drawKeyValue(doc, 'To', formatIST(filters.toDate));
      if (filters.useMock != null) drawKeyValue(doc, 'Mock Data', filters.useMock ? 'Yes' : 'No');
    }

    doc.end();
  });
}

module.exports = {
  generateKPIReportPDF,
};
