const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const reportRoutes = require('../routes/reportRoutes');
const { mockAuth } = require('../middleware/authMiddleware');
const MockDataService = require('../mocks/mockDataService');

// Create Express app for testing
const app = express();
app.use(express.json());

// Use mock authentication for tests
process.env.NODE_ENV = 'test';
app.use('/api/reports', mockAuth('admin'), reportRoutes);

describe('Report Controller - API Endpoints', () => {
  const testReportsDir = path.join(__dirname, '../../reports');
  let testReportId;

  beforeAll(() => {
    // Ensure reports directory exists
    if (!fs.existsSync(testReportsDir)) {
      fs.mkdirSync(testReportsDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test reports
    if (fs.existsSync(testReportsDir)) {
      const files = fs.readdirSync(testReportsDir);
      files.forEach((file) => {
        if (file.startsWith('RPT-') || file.startsWith('TEST-')) {
          const filePath = path.join(testReportsDir, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      });
    }
  });

  describe('POST /api/reports/generate', () => {
    it('should generate a PDF report successfully', async () => {
      const reportData = MockDataService.generateMockReportData();

      const response = await request(app)
        .post('/api/reports/generate')
        .send(reportData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportId');
      expect(response.body.data).toHaveProperty('filePath');
      expect(response.body.data).toHaveProperty('fileSize');
      expect(response.body.data.fileSize).toBeGreaterThan(0);

      testReportId = response.body.data.reportId;

      // Verify file was created
      expect(fs.existsSync(response.body.data.filePath)).toBe(true);
    }, 15000);

    it('should generate report with minimal required data', async () => {
      const minimalData = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
      };

      const response = await request(app)
        .post('/api/reports/generate')
        .send(minimalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reportId).toBeDefined();
    }, 15000);

    it('should return validation error for invalid date range', async () => {
      const invalidData = {
        startDate: new Date('2025-09-30').toISOString(),
        endDate: new Date('2025-09-01').toISOString(), // End before start
      };

      const response = await request(app)
        .post('/api/reports/generate')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should return validation error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should sanitize malicious input', async () => {
      const maliciousData = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        companyName: '<script>alert("xss")</script>Test Company',
        reportId: 'TEST<script>alert("xss")</script>123',
      };

      const response = await request(app)
        .post('/api/reports/generate')
        .send(maliciousData);

      if (response.status === 200) {
        expect(response.body.data.reportId).not.toContain('<script>');
      }
    }, 15000);

    it('should handle financial metrics correctly', async () => {
      const reportData = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        financialMetrics: {
          totalRevenue: 5000000,
          totalExpenses: 3000000,
          netProfit: 2000000,
          profitMargin: 40,
        },
      };

      const response = await request(app)
        .post('/api/reports/generate')
        .send(reportData)
        .expect(200);

      expect(response.body.success).toBe(true);
    }, 15000);
  });

  describe('GET /api/reports/list', () => {
    it('should list all generated reports', async () => {
      const response = await request(app)
        .get('/api/reports/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reports');
      expect(response.body.data).toHaveProperty('count');
      expect(Array.isArray(response.body.data.reports)).toBe(true);
    });

    it('should return reports with correct metadata', async () => {
      // Generate a test report first
      const reportData = MockDataService.generateMockReportData();
      await request(app).post('/api/reports/generate').send(reportData);

      const response = await request(app).get('/api/reports/list').expect(200);

      if (response.body.data.count > 0) {
        const report = response.body.data.reports[0];
        expect(report).toHaveProperty('reportId');
        expect(report).toHaveProperty('fileName');
        expect(report).toHaveProperty('size');
        expect(report).toHaveProperty('createdAt');
        expect(report).toHaveProperty('downloadUrl');
      }
    }, 15000);
  });

  describe('GET /api/reports/download/:reportId', () => {
    it('should download an existing report', async () => {
      // Generate a report first
      const reportData = MockDataService.generateMockReportData();
      const generateResponse = await request(app)
        .post('/api/reports/generate')
        .send(reportData);

      const reportId = generateResponse.body.data.reportId;

      const response = await request(app)
        .get(`/api/reports/download/${reportId}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    }, 15000);

    it('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .get('/api/reports/download/NON-EXISTENT-REPORT')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not Found');
    });

    it('should reject invalid report ID format', async () => {
      const response = await request(app)
        .get('/api/reports/download/../../../etc/passwd')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/reports/send', () => {
    it('should validate email sending request', async () => {
      const response = await request(app)
        .post('/api/reports/send')
        .send({
          reportId: 'TEST-REPORT',
          recipients: [], // Empty array should fail
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid email addresses', async () => {
      const response = await request(app)
        .post('/api/reports/send')
        .send({
          reportId: 'TEST-REPORT',
          recipients: ['invalid-email', 'another-invalid'],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .post('/api/reports/send')
        .send({
          reportId: 'NON-EXISTENT',
          recipients: ['test@example.com'],
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/reports/:reportId', () => {
    it('should delete an existing report', async () => {
      // Generate a report first
      const reportData = MockDataService.generateMockReportData();
      const generateResponse = await request(app)
        .post('/api/reports/generate')
        .send(reportData);

      const reportId = generateResponse.body.data.reportId;

      // Delete the report
      const deleteResponse = await request(app)
        .delete(`/api/reports/${reportId}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify it's deleted
      const filePath = path.join(testReportsDir, `${reportId}.pdf`);
      expect(fs.existsSync(filePath)).toBe(false);
    }, 15000);

    it('should return 404 when deleting non-existent report', async () => {
      const response = await request(app)
        .delete('/api/reports/NON-EXISTENT-REPORT')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid report ID format', async () => {
      const response = await request(app)
        .delete('/api/reports/../../../etc/passwd')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Tests', () => {
    it('should prevent path traversal attacks in download', async () => {
      const response = await request(app)
        .get('/api/reports/download/../../package.json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent path traversal attacks in delete', async () => {
      const response = await request(app)
        .delete('/api/reports/../../package.json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle SQL injection attempts in reportId', async () => {
      const response = await request(app)
        .get('/api/reports/download/TEST\'; DROP TABLE users; --')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent report generations', async () => {
      const promises = [];

      for (let i = 0; i < 3; i++) {
        const reportData = MockDataService.generateMockReportData();
        promises.push(
          request(app).post('/api/reports/generate').send(reportData)
        );
      }

      const results = await Promise.all(promises);

      results.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    }, 30000);
  });
});
