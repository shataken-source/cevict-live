// Error handling utilities for Progno Sports Prediction Platform

export class PrognoError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'PrognoError';
  }
}

export function handleError(error: unknown): {
  message: string;
  code: string;
  statusCode: number;
} {
  if (error instanceof PrognoError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'GENERIC_ERROR',
      statusCode: 500
    };
  }

  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500
  };
}

export function createValidationError(message: string): PrognoError {
  return new PrognoError(message, 'VALIDATION_ERROR', 400);
}

export function createPredictionError(message: string): PrognoError {
  return new PrognoError(message, 'PREDICTION_ERROR', 500);
}

export function createDataError(message: string): PrognoError {
  return new PrognoError(message, 'DATA_ERROR', 500);
}

export function createNetworkError(message: string): PrognoError {
  return new PrognoError(message, 'NETWORK_ERROR', 503);
}

export function logError(error: unknown, context?: string): void {
  const errorInfo = handleError(error);
  console.error(`[${context || 'Progno'}] ${errorInfo.code}: ${errorInfo.message}`, error);
}

export function isRetryableError(error: unknown): boolean {
  const errorInfo = handleError(error);
  const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVICE_UNAVAILABLE'];
  return retryableCodes.includes(errorInfo.code);
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data?: T; error?: { message: string; code: string } }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    logError(error, context);
    const errorInfo = handleError(error);
    return { error: { message: errorInfo.message, code: errorInfo.code } };
  }
}
