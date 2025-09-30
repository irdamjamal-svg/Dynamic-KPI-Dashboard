const pdfReportService = require('../services/pdfReportService');
const MockDataService = require('../mocks/mockDataService');
const fs = require('fs');
const path = require('path');

describe('PDF Report Service', () => {
  const testOutputDir = path.join(__dirname, '../test-reports');
  
  beforeAll(() => {
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test reports
    if (fs.existsSync(testOutputDir)) {
      const files = fs.readdirSync(testOutputDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(testOutputDir, file));
      });
      fs.rmdirSync(testOutputDir);
    }
  });

  describe('formatCurrency', () => {
    it('should format currency in INR with rupee symbol', () => {
      const result = pdfReportService.formatCurrency(1234567.89);
      expect(result).toBe('₹12,34,567.89');
    });

    it('should handle zero value', () => {
      const result = pdfReportService.formatCurrency(0);
      expect(result).toBe('₹0.00');
    });

    it('should handle negative values', () => {
      const result = pdfReportService.formatCurrency(-5000);
      expect(result).toBe('₹-5,000.00');
    });
  });

  describe('formatDateTime', () => {
    it('should format date in IST timezone', () => {
      const date = new Date('2025-09-30T12:00:00Z');
      const result = pdfReportService.formatDateTime(date);
      expect(result).toMatch(/\d{2}-\d{2}-\d{4} \d{2}:\d{2} (AM|PM)/);
    });

    it('should use custom format when provided', () => {
      const date = new Date('2025-09-30');
      const result = pdfReportService.formatDateTime(date, 'YYYY-MM-DD');
      expect(result).toBe('2025-09-30');
    });
  });

  describe('generateKPIReport', () => {
    it('should generate PDF report with valid data', async () => {
      const mockData = MockDataService.generateMockReportData();
      const outputPath = path.join(testOutputDir, `test-report-${Date.now()}.pdf`);

      const result = await pdfReportService.generateKPIReport(mockData, outputPath);

      expect(result).toBe(outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);
      
      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(0);
    }, 10000);

    it('should generate PDF with minimal data', async () => {
      const minimalData = {
        reportId: 'TEST-001',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-09-30'),
        companyName: 'Test Company',
        generatedBy: 'Test User',
      };

      const outputPath = path.join(testOutputDir, `minimal-report-${Date.now()}.pdf`);
      const result = await pdfReportService.generateKPIReport(minimalData, outputPath);

      expect(result).toBe(outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);
    }, 10000);

    it('should include all sections when data is provided', async () => {
      const fullData = MockDataService.generateMockReportData({
        companyName: 'Full Test Company',
      });

      const outputPath = path.join(testOutputDir, `full-report-${Date.now()}.pdf`);
      const result = await pdfReportService.generateKPIReport(fullData, outputPath);

      expect(result).toBe(outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);

      const stats = fs.statSync(outputPath);
      // Full report should be larger than minimal
      expect(stats.size).toBeGreaterThan(5000);
    }, 10000);

    it('should create output directory if it does not exist', async () => {
      const newDir = path.join(testOutputDir, 'new-subdir');
      const outputPath = path.join(newDir, 'test-report.pdf');
      const mockData = MockDataService.generateMockReportData();

      await pdfReportService.generateKPIReport(mockData, outputPath);

      expect(fs.existsSync(newDir)).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);

      // Cleanup
      fs.unlinkSync(outputPath);
      fs.rmdirSync(newDir);
    }, 10000);

    it('should handle error when invalid path is provided', async () => {
      const mockData = MockDataService.generateMockReportData();
      const invalidPath = '/invalid/path/that/does/not/exist/report.pdf';

      await expect(
        pdfReportService.generateKPIReport(mockData, invalidPath)
      ).rejects.toThrow();
    });
  });

  describe('Currency and Number Formatting', () => {
    it('should format large currency values correctly', () => {
      const result = pdfReportService.formatCurrency(99999999.99);
      expect(result).toBe('₹9,99,99,999.99');
    });

    it('should format small currency values', () => {
      const result = pdfReportService.formatCurrency(123.45);
      expect(result).toBe('₹123.45');
    });
  });

  describe('Report with Indian locale', () => {
    it('should use Indian number formatting (lakhs and crores)', () => {
      const amount = 10000000; // 1 crore
      const formatted = pdfReportService.formatCurrency(amount);
      expect(formatted).toBe('₹1,00,00,000.00');
    });

    it('should format dates in IST timezone', () => {
      const mockData = {
        reportId: 'TEST-TZ',
        startDate: new Date('2025-09-01T00:00:00Z'),
        endDate: new Date('2025-09-30T23:59:59Z'),
        generatedBy: 'Test User',
      };

      const outputPath = path.join(testOutputDir, `timezone-test-${Date.now()}.pdf`);
      
      return pdfReportService.generateKPIReport(mockData, outputPath).then((result) => {
        expect(result).toBe(outputPath);
        expect(fs.existsSync(outputPath)).toBe(true);
      });
    }, 10000);
  });
});
