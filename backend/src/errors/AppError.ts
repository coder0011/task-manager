// Base error class for the application
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;

  // Constructor for the AppError class with ECMAScript ErrorOptions cause support
  constructor(message: string, statusCode = 500, code?: string, details?: any, options?: { cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;
    this.details = details;

    // Capture the stack trace for debugging purposes
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types for different scenarios
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden: insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict occurred', code = 'CONFLICT', details?: any) {
    super(message, 409, code, details);
  }
}

export class ConcurrencyConflictError extends ConflictError {
  constructor(message = 'Optimistic concurrency version conflict detected. Please refresh.') {
    super(message, 'CONCURRENCY_CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: any) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}
