/**
 * Structured Logging System
 * Production-ready logging with levels, formatting, and optional external services
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  requestId?: string;
  userId?: string;
  error?: Error;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Set log level from env or default
    const levelStr = process.env.LOG_LEVEL?.toUpperCase() || (this.isDevelopment ? 'DEBUG' : 'INFO');
    this.level = LogLevel[levelStr as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const levelStr = LogLevel[entry.level];
    const contextStr = entry.context ? JSON.stringify(entry.context) : '';
    const requestIdStr = entry.requestId ? `[${entry.requestId}]` : '';
    const userIdStr = entry.userId ? `[user:${entry.userId}]` : '';
    
    return `${timestamp} [${levelStr}]${requestIdStr}${userIdStr} ${entry.message} ${contextStr}`;
  }

  private sanitize(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'auth', 'credential'];
    
    for (const key in sanitized) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }
    
    return sanitized;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: context ? this.sanitize(context) : undefined,
      error
    };

    const formatted = this.formatMessage(entry);

    // Console output
    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        if (error) console.error(error.stack);
        break;
    }

    // In production, send to external logging service
    if (!this.isDevelopment && level >= LogLevel.ERROR) {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // Send to external logging service (Datadog, LogRocket, etc.)
    // This is a placeholder - implement based on your logging service
    try {
      // Example: Send to API endpoint
      if (process.env.LOGGING_API_URL) {
        await fetch(process.env.LOGGING_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
      }
    } catch (error) {
      // Fail silently to avoid logging loops
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience functions
export function logDebug(message: string, context?: Record<string, any>): void {
  logger.debug(message, context);
}

export function logInfo(message: string, context?: Record<string, any>): void {
  logger.info(message, context);
}

export function logWarn(message: string, context?: Record<string, any>): void {
  logger.warn(message, context);
}

export function logError(message: string, error?: Error, context?: Record<string, any>): void {
  logger.error(message, error, context);
}












