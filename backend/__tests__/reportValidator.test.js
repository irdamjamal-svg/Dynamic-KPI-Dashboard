const {
  reportGenerationSchema,
  emailSendSchema,
  validateRequest,
  sanitizeReportData,
} = require('../validators/reportValidator');

describe('Report Validator', () => {
  describe('reportGenerationSchema', () => {
    it('should validate valid report data', () => {
      const validData = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        reportId: 'TEST123',
        companyName: 'Test Company Pvt Ltd',
      };

      const { error, value } = reportGenerationSchema.validate(validData);
      expect(error).toBeUndefined();
      expect(value).toMatchObject(validData);
    });

    it('should accept minimal required data', () => {
      const minimalData = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
      };

      const { error } = reportGenerationSchema.validate(minimalData);
      expect(error).toBeUndefined();
    });

    it('should reject missing start date', () => {
      const invalidData = {
        endDate: new Date('2025-09-30').toISOString(),
      };

      const { error } = reportGenerationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('startDate');
    });

    it('should reject missing end date', () => {
      const invalidData = {
        startDate: new Date('2025-09-01').toISOString(),
      };

      const { error } = reportGenerationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('endDate');
    });

    it('should reject end date before start date', () => {
      const invalidData = {
        startDate: new Date('2025-09-30').toISOString(),
        endDate: new Date('2025-09-01').toISOString(),
      };

      const { error } = reportGenerationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject future start date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const invalidData = {
        startDate: futureDate.toISOString(),
        endDate: new Date().toISOString(),
      };

      const { error } = reportGenerationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid reportId format', () => {
      const invalidData = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        reportId: 'AB', // Too short
      };

      const { error } = reportGenerationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject reportId with special characters', () => {
      const invalidData = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        reportId: 'TEST@123!',
      };

      const { error } = reportGenerationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should validate KPI array', () => {
      const dataWithKPIs = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        kpis: [
          {
            name: 'Revenue',
            value: 1000000,
            isCurrency: true,
            target: 900000,
          },
        ],
      };

      const { error } = reportGenerationSchema.validate(dataWithKPIs);
      expect(error).toBeUndefined();
    });

    it('should reject invalid KPI structure', () => {
      const invalidData = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        kpis: [
          {
            name: 'Revenue',
            // Missing required 'value' field
          },
        ],
      };

      const { error } = reportGenerationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should validate financial metrics', () => {
      const dataWithFinancials = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        financialMetrics: {
          totalRevenue: 5000000,
          totalExpenses: 3000000,
          netProfit: 2000000,
          profitMargin: 40,
          avgDealValue: 125000,
        },
      };

      const { error } = reportGenerationSchema.validate(dataWithFinancials);
      expect(error).toBeUndefined();
    });

    it('should reject negative revenue', () => {
      const invalidData = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        financialMetrics: {
          totalRevenue: -1000,
        },
      };

      const { error } = reportGenerationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should validate email recipients', () => {
      const dataWithEmails = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        emailRecipients: ['test1@example.com', 'test2@example.com'],
      };

      const { error } = reportGenerationSchema.validate(dataWithEmails);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email addresses', () => {
      const invalidData = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        emailRecipients: ['invalid-email', 'test@example.com'],
      };

      const { error } = reportGenerationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject too many email recipients', () => {
      const invalidData = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        emailRecipients: Array(51).fill('test@example.com'),
      };

      const { error } = reportGenerationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should strip unknown fields', () => {
      const dataWithExtra = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        unknownField: 'should be removed',
        anotherUnknown: 123,
      };

      const { error, value } = reportGenerationSchema.validate(dataWithExtra, {
        stripUnknown: true,
      });

      expect(error).toBeUndefined();
      expect(value).not.toHaveProperty('unknownField');
      expect(value).not.toHaveProperty('anotherUnknown');
    });
  });

  describe('emailSendSchema', () => {
    it('should validate valid email send request', () => {
      const validData = {
        reportId: 'TEST-123',
        recipients: ['test1@example.com', 'test2@example.com'],
      };

      const { error } = emailSendSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing reportId', () => {
      const invalidData = {
        recipients: ['test@example.com'],
      };

      const { error } = emailSendSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('reportId');
    });

    it('should reject empty recipients array', () => {
      const invalidData = {
        reportId: 'TEST-123',
        recipients: [],
      };

      const { error } = emailSendSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject missing recipients', () => {
      const invalidData = {
        reportId: 'TEST-123',
      };

      const { error } = emailSendSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should validate optional subject and message', () => {
      const validData = {
        reportId: 'TEST-123',
        recipients: ['test@example.com'],
        subject: 'Custom Subject',
        message: 'Custom message content',
      };

      const { error } = emailSendSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject too long subject', () => {
      const invalidData = {
        reportId: 'TEST-123',
        recipients: ['test@example.com'],
        subject: 'A'.repeat(201),
      };

      const { error } = emailSendSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('validateRequest middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { body: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    it('should call next() with valid data', () => {
      req.body = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
      };

      const middleware = validateRequest(reportGenerationSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 with invalid data', () => {
      req.body = {
        startDate: 'invalid-date',
      };

      const middleware = validateRequest(reportGenerationSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should sanitize request body', () => {
      req.body = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        unknownField: 'should be removed',
      };

      const middleware = validateRequest(reportGenerationSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).not.toHaveProperty('unknownField');
    });

    it('should provide detailed error messages', () => {
      req.body = {
        startDate: new Date('2025-09-30').toISOString(),
        endDate: new Date('2025-09-01').toISOString(),
      };

      const middleware = validateRequest(reportGenerationSchema);
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.details).toBeDefined();
      expect(Array.isArray(jsonCall.details)).toBe(true);
    });
  });

  describe('sanitizeReportData', () => {
    it('should remove script tags from company name', () => {
      const data = {
        companyName: '<script>alert("xss")</script>Test Company',
      };

      const sanitized = sanitizeReportData(data);
      expect(sanitized.companyName).toBe('Test Company');
    });

    it('should remove HTML tags', () => {
      const data = {
        reportId: '<b>TEST</b>-123',
        companyName: '<div>Company</div> Name',
      };

      const sanitized = sanitizeReportData(data);
      expect(sanitized.reportId).toBe('TEST-123');
      expect(sanitized.companyName).toBe('Company Name');
    });

    it('should trim whitespace', () => {
      const data = {
        reportId: '  TEST-123  ',
        companyName: '  Test Company  ',
      };

      const sanitized = sanitizeReportData(data);
      expect(sanitized.reportId).toBe('TEST-123');
      expect(sanitized.companyName).toBe('Test Company');
    });

    it('should not modify non-string fields', () => {
      const data = {
        reportId: 'TEST-123',
        startDate: new Date('2025-09-01'),
        financialMetrics: {
          revenue: 1000000,
        },
      };

      const sanitized = sanitizeReportData(data);
      expect(sanitized.startDate).toEqual(data.startDate);
      expect(sanitized.financialMetrics).toEqual(data.financialMetrics);
    });

    it('should handle missing fields gracefully', () => {
      const data = {
        someOtherField: 'value',
      };

      const sanitized = sanitizeReportData(data);
      expect(sanitized).toEqual(data);
    });

    it('should handle null and undefined values', () => {
      const data = {
        reportId: null,
        companyName: undefined,
        generatedBy: 'Test User',
      };

      const sanitized = sanitizeReportData(data);
      expect(sanitized.reportId).toBeNull();
      expect(sanitized.companyName).toBeUndefined();
      expect(sanitized.generatedBy).toBe('Test User');
    });

    it('should prevent XSS attacks', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        '<iframe src="javascript:alert(\'xss\')">',
        '<body onload=alert("xss")>',
      ];

      xssAttempts.forEach((xss) => {
        const data = { companyName: xss };
        const sanitized = sanitizeReportData(data);
        expect(sanitized.companyName).not.toContain('<');
        expect(sanitized.companyName).not.toContain('script');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long company names', () => {
      const longName = 'A'.repeat(200);
      const data = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        companyName: longName,
      };

      const { error } = reportGenerationSchema.validate(data);
      expect(error).toBeDefined(); // Should fail max length validation
    });

    it('should handle date boundaries', () => {
      const today = new Date();
      const data = {
        startDate: today.toISOString(),
        endDate: today.toISOString(),
      };

      const { error } = reportGenerationSchema.validate(data);
      expect(error).toBeUndefined(); // Same day range is valid
    });

    it('should handle negative numbers in metrics', () => {
      const data = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        financialMetrics: {
          netProfit: -500000, // Negative profit is valid (loss)
        },
      };

      const { error } = reportGenerationSchema.validate(data);
      expect(error).toBeUndefined();
    });

    it('should handle zero values', () => {
      const data = {
        startDate: new Date('2025-09-01').toISOString(),
        endDate: new Date('2025-09-30').toISOString(),
        kpis: [
          {
            name: 'Zero Value KPI',
            value: 0,
          },
        ],
      };

      const { error } = reportGenerationSchema.validate(data);
      expect(error).toBeUndefined();
    });
  });
});
