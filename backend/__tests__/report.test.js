const httpMocks = require('node-mocks-http');
const { generateReport } = require('../controllers/reportController');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

// Mock the services
jest.mock('../services/pdfService');
jest.mock('../services/emailService');
jest.mock('../config/logger');

describe('Report Controller', () => {
  it('should generate and send a report successfully', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/api/reports/generate',
      body: {
        email: 'test@example.com',
      },
      user: { id: '123', role: 'admin' }, // Mock user from auth middleware
    });
    const res = httpMocks.createResponse();

    pdfService.generatePdf.mockReturnValue(Buffer.from('mock pdf'));
    emailService.sendReportEmail.mockResolvedValue();

    await generateReport(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().message).toBe('Report successfully generated and sent.');
    expect(pdfService.generatePdf).toHaveBeenCalled();
    expect(emailService.sendReportEmail).toHaveBeenCalledWith('test@example.com', expect.any(Buffer));
    expect(logger.info).toHaveBeenCalled();
  });

  it('should return a 400 error for invalid input', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      url: '/api/reports/generate',
      body: {
        email: 'invalid-email',
      },
      user: { id: '123', role: 'admin' },
    });
    const res = httpMocks.createResponse();

    await generateReport(req, res);

    expect(res.statusCode).toBe(400);
  });
});
