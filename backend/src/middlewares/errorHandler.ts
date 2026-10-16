import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { AppError } from '../errors/AppError.js';
import logger from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error | AppError | any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If response has already started streaming, delegate to default express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        statusCode: 400,
        code: 'FILE_TOO_LARGE',
        error: 'File size exceeds maximum allowable limit of 10MB.'
      });
      return;
    }
    res.status(400).json({
      success: false,
      statusCode: 400,
      code: 'UPLOAD_ERROR',
      error: `Upload error: ${err.message}`
    });
    return;
  }

  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));

    res.status(422).json({
      success: false,
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      error: 'Invalid request payload validation',
      details: formattedErrors
    });
    return;
  }

  // Handle Custom AppError Hierarchy
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      code: err.code || 'APP_ERROR',
      error: err.message,
      ...(err.details ? { details: err.details } : {})
    });
    return;
  }

  // Handle MySQL Duplicate Entry (ER_DUP_ENTRY)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    res.status(409).json({
      success: false,
      statusCode: 409,
      code: 'DUPLICATE_ENTRY',
      error: 'A record with the specified unique attributes already exists.'
    });
    return;
  }

  // Handle Body-Parser JSON syntax errors (Malformed JSON payload)
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    res.status(400).json({
      success: false,
      statusCode: 400,
      code: 'MALFORMED_JSON',
      error: 'Malformed JSON payload in request body.'
    });
    return;
  }

  // Handle Default / Uncaught Errors
  logger.error({ err, reqId: (req as any).id }, '[Unhandled API Exception]');
  const isProduction = env.isProduction;
  const showDebugDetails = env.enableDebug || !isProduction;

  res.status(500).json({
    success: false,
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    error: isProduction && !env.enableDebug ? 'An unexpected internal server error occurred.' : err.message || 'Internal Server Error',
    ...(showDebugDetails && err.stack ? { stack: err.stack } : {})
  });
}
