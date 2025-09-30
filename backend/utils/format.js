function formatINR(amount) {
  try {
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
    if (!isFinite(num)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(num);
  } catch (e) {
    return '₹0.00';
  }
}

function formatIST(date = new Date()) {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function fileTimestampIST(date = new Date()) {
  return new Date(date)
    .toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
    .replace(/[,\s:]/g, '_')
    .replace(/[\/]/g, '-');
}

module.exports = {
  formatINR,
  formatIST,
  fileTimestampIST,
};
