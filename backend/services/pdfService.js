const { jsPDF } = require("jspdf");

const generatePdf = (kpiData) => {
  const doc = new jsPDF();

  // Set document properties
  doc.setProperties({
    title: kpiData.title,
    subject: 'KPI Report',
    author: 'Dynamic KPI Dashboard',
  });

  // Add header
  doc.setFontSize(22);
  doc.text(kpiData.title, 20, 20);

  // Add subheader
  doc.setFontSize(12);
  doc.text(`Period: ${kpiData.period}`, 20, 30);
  doc.text(`Generated At: ${kpiData.generatedAt}`, 20, 35);

  // Add KPI data table
  const tableColumn = ["Metric", "Value", "Target"];
  const tableRows = [];

  kpiData.data.forEach(item => {
    const row = [item.metric, item.value, item.target];
    tableRows.push(row);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 50,
  });

  // Return the PDF as a buffer
  return doc.output('arraybuffer');
};

module.exports = { generatePdf };
