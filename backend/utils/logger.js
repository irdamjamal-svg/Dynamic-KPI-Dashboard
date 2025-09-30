const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (e) {
    // fallback to current directory if unable to create logs dir
  }
}

const logFormat = format.printf(({ level, message, timestamp, stack, ...meta }) => {
  const base = `${timestamp} [${level}] ${message}`;
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return stack ? `${base}\n${stack}${metaStr}` : `${base}${metaStr}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    logFormat
  ),
  transports: [
    new transports.Console({}),
    new transports.File({ filename: path.join(logsDir, 'app.log') }),
  ],
});

module.exports = logger;
