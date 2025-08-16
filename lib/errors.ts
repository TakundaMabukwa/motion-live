import { NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';

/**
 * Base error class for application errors
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  
  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error class for invalid input
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

/**
 * Error class for authentication failures
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Error class for permission issues
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Error class for resource not found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Error class for conflict errors
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Error class for rate limiting
 */
export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

/**
 * Handle API errors consistently
 * @param error The error to handle
 * @param defaultMessage Default message to use if error doesn't have one
 * @param logger Optional logger to log the error
 * @returns A NextResponse with appropriate status code and error details
 */
export function handleApiError(
  error: Error,
  defaultMessage: string = 'An unexpected error occurred',
  logger?: Logger
): NextResponse {
  // Log the error if logger is provided
  if (logger) {
    logger.error(defaultMessage, error);
  } else {
    console.error(defaultMessage, error);
  }
  
  // Handle AppError instances
  if (error instanceof AppError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      },
      { status: error.statusCode }
    );
  }
  
  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return NextResponse.json(
      { 
        error: 'Validation error',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    );
  }
  
  // Handle other errors as 500 Internal Server Error
  return NextResponse.json(
    { 
      error: defaultMessage,
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    },
    { status: 500 }
  );
}
