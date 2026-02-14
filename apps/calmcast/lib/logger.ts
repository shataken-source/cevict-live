import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Create a Winston logger with structured logging
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'calmcast' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export interface LogContext {
  requestId?: string;
  apiKey?: string;
  ip?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: string;
  [key: string]: any;
}

export class RequestLogger {
  private context: LogContext;
  
  constructor(context: Partial<LogContext> = {}) {
    this.context = {
      requestId: uuidv4(),
      ...context
    };
  }
  
  setContext(key: string, value: any): void {
    this.context[key] = value;
  }
  
  info(message: string, additionalContext: Partial<LogContext> = {}): void {
    logger.info(message, { ...this.context, ...additionalContext });
  }
  
  warn(message: string, additionalContext: Partial<LogContext> = {}): void {
    logger.warn(message, { ...this.context, ...additionalContext });
  }
  
  error(message: string, error?: Error | string, additionalContext: Partial<LogContext> = {}): void {
    const errorContext = {
      ...this.context,
      ...additionalContext,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    };
    logger.error(message, errorContext);
  }
  
  getContext(): LogContext {
    return { ...this.context };
  }
}

export function createRequestLogger(request: Request): RequestLogger {
  const url = new URL(request.url);
  return new RequestLogger({
    method: request.method,
    endpoint: url.pathname,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
        request.headers.get('x-real-ip') || 
        'unknown'
  });
}

// Performance monitoring helper
export function logPerformance(
  operation: string, 
  startTime: number, 
  context: Partial<LogContext> = {}
): void {
  const duration = Date.now() - startTime;
  logger.info(`Performance: ${operation}`, {
    operation,
    duration,
    ...context
  });
}
