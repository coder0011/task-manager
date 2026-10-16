import { pinoHttp } from 'pino-http';
import crypto from 'node:crypto';
import logger from '../utils/logger.js';

// Middleware for logging HTTP requests and responses using Pino
export const httpLogger = pinoHttp({
  logger,
  // Generate a unique request ID for each incoming request, or use an existing one if provided
  genReqId: (req) => {
    const existing = req.headers['x-request-id'];
    if (existing && typeof existing === 'string') return existing;
    return crypto.randomUUID();
  },
  // Customize the log level based on the response status code and presence of errors
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Customize the log message format for successful requests and errors
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} -> ${res.statusCode}`;
  },
  // Customize the log message format for errors, including the request method, URL, response status code, and error message
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed with ${res.statusCode}: ${err.message}`;
  }
});
