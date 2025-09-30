const logger = require('../utils/logger');

function notFound(req, res, next) {
  const message = `Not Found - ${req.originalUrl}`;
  res.status(404);
  next(new Error(message));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const response = {
    message: err.message || 'Server Error',
  };
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  logger.error('Request failed', {
    status,
    method: req.method,
    url: req.originalUrl,
    error: err.message,
  });
  res.status(status).json(response);
}

module.exports = { notFound, errorHandler };
