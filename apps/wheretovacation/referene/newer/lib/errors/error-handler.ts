/**
 * Enterprise-level error handling and logging
 */

export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // External service errors
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: any;
  statusCode: number;
  timestamp: string;
  requestId?: string;
}

/**
 * Create standardized error response
 */
export function createError(
  code: ErrorCode,
  message: string,
  details?: any,
  statusCode?: number
): AppError {
  const error: AppError = {
    code,
    message,
    details,
    statusCode: statusCode || getDefaultStatusCode(code),
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };
  
  // Log error in production
  if (process.env.NODE_ENV === 'production') {
    logError(error);
  }
  
  return error;
}

/**
 * Get default status code for error code
 */
function getDefaultStatusCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.UNAUTHORIZED:
      return 401;
    case ErrorCode.FORBIDDEN:
      return 403;
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.INVALID_INPUT:
      return 400;
    case ErrorCode.NOT_FOUND:
      return 404;
    case ErrorCode.DUPLICATE_ENTRY:
      return 409;
    case ErrorCode.RATE_LIMIT_EXCEEDED:
      return 429;
    case ErrorCode.SERVICE_UNAVAILABLE:
      return 503;
    default:
      return 500;
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log error (in production, send to logging service)
 */
function logError(error: AppError): void {
  // In production, send to logging service (e.g., Sentry, LogRocket)
  console.error('[ERROR]', {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    requestId: error.requestId,
    timestamp: error.timestamp,
    details: process.env.NODE_ENV === 'development' ? error.details : undefined
  });
}

/**
 * Handle database errors
 */
export function handleDatabaseError(error: any): AppError {
  // Supabase/PostgreSQL error codes
  if (error.code === '23505') { // Unique violation
    return createError(
      ErrorCode.DUPLICATE_ENTRY,
      'A record with this information already exists',
      { field: error.detail },
      409
    );
  }
  
  if (error.code === '23503') { // Foreign key violation
    return createError(
      ErrorCode.VALIDATION_ERROR,
      'Referenced record does not exist',
      { field: error.detail },
      400
    );
  }
  
  if (error.code === '42P01') { // Table doesn't exist
    return createError(
      ErrorCode.DATABASE_ERROR,
      'Database table not found',
      undefined,
      500
    );
  }
  
  if (error.code === 'PGRST116') { // No rows returned
    return createError(
      ErrorCode.NOT_FOUND,
      'Record not found',
      undefined,
      404
    );
  }
  
  // Generic database error
  return createError(
    ErrorCode.DATABASE_ERROR,
    'Database operation failed',
    process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined,
    500
  );
}

/**
 * Handle validation errors
 */
export function handleValidationError(errors: string[]): AppError {
  return createError(
    ErrorCode.VALIDATION_ERROR,
    'Validation failed',
    { errors },
    400
  );
}

/**
 * Safe error response (don't expose sensitive info in production)
 */
export function getSafeErrorResponse(error: AppError): any {
  const response: any = {
    error: error.code,
    message: error.message,
    timestamp: error.timestamp
  };
  
  // Only include details in development
  if (process.env.NODE_ENV === 'development') {
    response.details = error.details;
    response.requestId = error.requestId;
  }
  
  return response;
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error: any) {
      // Handle known errors
      if (error.code && error.statusCode) {
        throw error;
      }
      
      // Handle database errors
      if (error.code && error.code.startsWith('PGRST') || error.code && error.code.startsWith('42')) {
        throw handleDatabaseError(error);
      }
      
      // Generic error
      throw createError(
        ErrorCode.INTERNAL_ERROR,
        'An unexpected error occurred',
        process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined
      );
    }
  }) as T;
}












