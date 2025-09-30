const Joi = require('joi');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Joi schema for report generation request
 */
const reportGenerationSchema = Joi.object({
  reportId: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .optional()
    .messages({
      'string.alphanum': 'Report ID must contain only alphanumeric characters',
      'string.min': 'Report ID must be at least 3 characters long',
      'string.max': 'Report ID cannot exceed 50 characters',
    }),

  startDate: Joi.date()
    .iso()
    .max('now')
    .required()
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.max': 'Start date cannot be in the future',
      'any.required': 'Start date is required',
    }),

  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .max('now')
    .required()
    .messages({
      'date.base': 'End date must be a valid date',
      'date.min': 'End date must be after start date',
      'date.max': 'End date cannot be in the future',
      'any.required': 'End date is required',
    }),

  companyName: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Company name must be at least 2 characters long',
      'string.max': 'Company name cannot exceed 100 characters',
    }),

  kpis: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.number().required(),
        isCurrency: Joi.boolean().optional(),
        target: Joi.number().optional(),
      })
    )
    .optional(),

  financialMetrics: Joi.object({
    totalRevenue: Joi.number().min(0).optional(),
    totalExpenses: Joi.number().min(0).optional(),
    netProfit: Joi.number().optional(),
    profitMargin: Joi.number().min(-100).max(100).optional(),
    avgDealValue: Joi.number().min(0).optional(),
  }).optional(),

  performanceMetrics: Joi.object({
    tasksCompleted: Joi.number().integer().min(0).optional(),
    tasksPending: Joi.number().integer().min(0).optional(),
    completionRate: Joi.number().min(0).max(100).optional(),
    avgResponseTime: Joi.number().min(0).optional(),
    customerSatisfaction: Joi.number().min(0).max(5).optional(),
  }).optional(),

  employeeStats: Joi.object({
    totalEmployees: Joi.number().integer().min(0).optional(),
    activeEmployees: Joi.number().integer().min(0).optional(),
    avgProductivity: Joi.number().min(0).max(100).optional(),
    departmentCount: Joi.number().integer().min(0).optional(),
  }).optional(),

  customerStats: Joi.object({
    totalCustomers: Joi.number().integer().min(0).optional(),
    activeCustomers: Joi.number().integer().min(0).optional(),
    newCustomers: Joi.number().integer().min(0).optional(),
    retentionRate: Joi.number().min(0).max(100).optional(),
    avgLifetimeValue: Joi.number().min(0).optional(),
  }).optional(),

  emailRecipients: Joi.array()
    .items(Joi.string().email())
    .max(50)
    .optional()
    .messages({
      'string.email': 'Invalid email address in recipients list',
      'array.max': 'Cannot send to more than 50 recipients at once',
    }),

  sendEmail: Joi.boolean().optional(),

  includeCharts: Joi.boolean().optional(),
});

/**
 * Joi schema for email sending request
 */
const emailSendSchema = Joi.object({
  reportId: Joi.string().required().messages({
    'any.required': 'Report ID is required',
  }),

  recipients: Joi.array()
    .items(Joi.string().email())
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one recipient is required',
      'array.max': 'Cannot send to more than 50 recipients at once',
      'string.email': 'Invalid email address in recipients list',
      'any.required': 'Recipients list is required',
    }),

  subject: Joi.string().min(5).max(200).optional(),

  message: Joi.string().max(1000).optional(),
});

/**
 * Middleware to validate request body against Joi schema
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        logger.warn('Validation failed', { errors, body: req.body });

        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors,
        });
      }

      // Replace req.body with validated and sanitized data
      req.body = value;
      next();
    } catch (err) {
      logger.error(`Validation middleware error: ${err.message}`);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Validation process failed',
      });
    }
  };
};

/**
 * Express-validator rules for report generation
 */
const reportGenerationRules = [
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .toDate(),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .toDate()
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('reportId')
    .optional()
    .isAlphanumeric()
    .withMessage('Report ID must contain only alphanumeric characters')
    .isLength({ min: 3, max: 50 })
    .withMessage('Report ID must be between 3 and 50 characters'),
  body('emailRecipients')
    .optional()
    .isArray({ max: 50 })
    .withMessage('Recipients must be an array with maximum 50 items'),
  body('emailRecipients.*')
    .optional()
    .isEmail()
    .withMessage('Invalid email address in recipients list'),
];

/**
 * Express-validator middleware to check results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Express-validator validation failed', { errors: errors.array() });
    
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid input data',
      details: errors.array(),
    });
  }
  
  next();
};

/**
 * Sanitize report data to prevent injection attacks
 */
const sanitizeReportData = (data) => {
  const sanitized = { ...data };

  // Remove any potential script tags or HTML from string fields
  const stringFields = ['reportId', 'companyName', 'generatedBy'];
  stringFields.forEach((field) => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitized[field]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
    }
  });

  return sanitized;
};

module.exports = {
  reportGenerationSchema,
  emailSendSchema,
  validateRequest,
  reportGenerationRules,
  handleValidationErrors,
  sanitizeReportData,
};
