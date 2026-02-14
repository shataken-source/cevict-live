/**
 * Enterprise Error Handling System for PetReunion
 * Provides centralized error logging, monitoring, and graceful degradation
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  NETWORK = 'network',
  SYSTEM = 'system',
  BUSINESS_LOGIC = 'business_logic',
  SECURITY = 'security'
}

// Enhanced error interface
export interface EnterpriseError {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context: {
    userId?: string;
    endpoint?: string;
    method?: string;
    ip?: string;
    userAgent?: string;
    requestId?: string;
    [key: string]: any;
  };
  metadata?: {
    databaseError?: string;
    externalService?: string;
    responseTime?: number;
    retryCount?: number;
    [key: string]: any;
  };
}

// Error monitoring configuration
interface ErrorMonitoringConfig {
  enableDatabaseLogging: boolean;
  enableConsoleLogging: boolean;
  enableExternalMonitoring: boolean;
  maxLogRetries: number;
  logRetentionDays: number;
  alertThresholds: {
    [ErrorSeverity.LOW]: number;
    [ErrorSeverity.MEDIUM]: number;
    [ErrorSeverity.HIGH]: number;
    [ErrorSeverity.CRITICAL]: number;
  };
}

const DEFAULT_CONFIG: ErrorMonitoringConfig = {
  enableDatabaseLogging: true,
  enableConsoleLogging: true,
  enableExternalMonitoring: false, // Set to true when integrating with external services
  maxLogRetries: 3,
  logRetentionDays: 30,
  alertThresholds: {
    [ErrorSeverity.LOW]: 50,
    [ErrorSeverity.MEDIUM]: 20,
    [ErrorSeverity.HIGH]: 10,
    [ErrorSeverity.CRITICAL]: 1
  }
};

export class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorMonitoringConfig;
  private supabase: any;
  private errorCounts: Map<string, number> = new Map();

  constructor(config: Partial<ErrorMonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseServiceKey) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
  }

  static getInstance(config?: Partial<ErrorMonitoringConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  // Generate unique error ID
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Categorize error based on type and message
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('token')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return ErrorCategory.AUTHORIZATION;
    }
    if (message.includes('database') || message.includes('supabase') || message.includes('sql')) {
      return ErrorCategory.DATABASE;
    }
    if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('external') || message.includes('api')) {
      return ErrorCategory.EXTERNAL_API;
    }
    if (message.includes('security') || message.includes('rate limit')) {
      return ErrorCategory.SECURITY;
    }
    
    return ErrorCategory.SYSTEM;
  }

  // Determine error severity
  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    if (category === ErrorCategory.SECURITY) {
      return ErrorSeverity.HIGH;
    }
    if (category === ErrorCategory.DATABASE && error.message.includes('connection')) {
      return ErrorSeverity.CRITICAL;
    }
    if (category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.AUTHORIZATION) {
      return ErrorSeverity.MEDIUM;
    }
    if (category === ErrorCategory.VALIDATION) {
      return ErrorSeverity.LOW;
    }
    
    return ErrorSeverity.MEDIUM;
  }

  // Log error to database
  private async logToDatabase(error: EnterpriseError): Promise<boolean> {
    if (!this.config.enableDatabaseLogging || !this.supabase) {
      return false;
    }

    let retries = 0;
    while (retries < this.config.maxLogRetries) {
      try {
        await this.supabase.from('error_logs').insert({
          id: error.id,
          timestamp: error.timestamp,
          severity: error.severity,
          category: error.category,
          message: error.message,
          stack: error.stack,
          context: error.context,
          metadata: error.metadata
        });
        return true;
      } catch (logError) {
        retries++;
        if (retries >= this.config.maxLogRetries) {
          console.error('Failed to log error to database after retries:', logError);
          return false;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100));
      }
    }
    return false;
  }

  // Log error to console
  private logToConsole(error: EnterpriseError): void {
    if (!this.config.enableConsoleLogging) return;

    const logMessage = `[${error.severity.toUpperCase()}] ${error.category}: ${error.message}`;
    const logData = {
      id: error.id,
      timestamp: error.timestamp,
      context: error.context,
      metadata: error.metadata
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(logMessage, logData);
        break;
      case ErrorSeverity.HIGH:
        console.error(logMessage, logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage, logData);
        break;
      case ErrorSeverity.LOW:
        console.log(logMessage, logData);
        break;
    }
  }

  // Send to external monitoring service
  private async sendToExternalMonitoring(error: EnterpriseError): Promise<void> {
    if (!this.config.enableExternalMonitoring) return;

    // Integration with services like Sentry, DataDog, etc.
    // This is a placeholder for external monitoring integration
    try {
      // Example: await sendToSentry(error);
      console.log('External monitoring integration placeholder:', error.id);
    } catch (monitoringError) {
      console.error('Failed to send error to external monitoring:', monitoringError);
    }
  }

  // Check alert thresholds
  private async checkAlertThresholds(error: EnterpriseError): Promise<void> {
    const key = `${error.category}_${error.severity}`;
    const currentCount = (this.errorCounts.get(key) || 0) + 1;
    this.errorCounts.set(key, currentCount);

    const threshold = this.config.alertThresholds[error.severity];
    if (currentCount >= threshold) {
      await this.triggerAlert(error, currentCount);
      // Reset count after alert
      this.errorCounts.set(key, 0);
    }
  }

  // Trigger alert
  private async triggerAlert(error: EnterpriseError, count: number): Promise<void> {
    const alertMessage = `🚨 Alert: ${count} ${error.severity} errors in ${error.category} category`;
    
    console.error(alertMessage, {
      latestError: error.id,
      timestamp: error.timestamp,
      count
    });

    // Send to alerting system (email, Slack, etc.)
    if (this.supabase) {
      try {
        await this.supabase.from('error_alerts').insert({
          id: `alert_${Date.now()}`,
          timestamp: new Date().toISOString(),
          severity: error.severity,
          category: error.category,
          message: alertMessage,
          count,
          latest_error_id: error.id
        });
      } catch (alertError) {
        console.error('Failed to create alert:', alertError);
      }
    }
  }

  // Main error handling method
  async handleError(
    error: Error,
    context: Partial<EnterpriseError['context']> = {},
    metadata: Partial<EnterpriseError['metadata']> = {}
  ): Promise<EnterpriseError> {
    const enterpriseError: EnterpriseError = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      severity: this.determineSeverity(error, this.categorizeError(error)),
      category: this.categorizeError(error),
      message: error.message,
      stack: error.stack,
      context: {
        ...context,
        requestId: context.requestId || this.generateErrorId()
      },
      metadata
    };

    // Log error
    await Promise.all([
      this.logToDatabase(enterpriseError),
      this.logToConsole(enterpriseError),
      this.sendToExternalMonitoring(enterpriseError),
      this.checkAlertThresholds(enterpriseError)
    ]);

    return enterpriseError;
  }

  // Create user-friendly error response
  createErrorResponse(error: EnterpriseError): NextResponse {
    const userMessages = {
      [ErrorCategory.VALIDATION]: 'Invalid input provided. Please check your data and try again.',
      [ErrorCategory.AUTHENTICATION]: 'Authentication required. Please log in and try again.',
      [ErrorCategory.AUTHORIZATION]: 'You do not have permission to perform this action.',
      [ErrorCategory.DATABASE]: 'A database error occurred. Please try again later.',
      [ErrorCategory.EXTERNAL_API]: 'External service unavailable. Please try again later.',
      [ErrorCategory.NETWORK]: 'Network error occurred. Please check your connection and try again.',
      [ErrorCategory.SYSTEM]: 'System error occurred. Please try again later.',
      [ErrorCategory.BUSINESS_LOGIC]: 'Operation could not be completed. Please contact support.',
      [ErrorCategory.SECURITY]: 'Security violation detected. Access denied.'
    };

    const statusCode = {
      [ErrorSeverity.LOW]: 400,
      [ErrorSeverity.MEDIUM]: 400,
      [ErrorSeverity.HIGH]: 500,
      [ErrorSeverity.CRITICAL]: 503
    }[error.severity];

    const message = userMessages[error.category] || 'An error occurred. Please try again.';

    return NextResponse.json(
      {
        error: message,
        errorId: error.id,
        timestamp: error.timestamp,
        // Only include details in development
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          category: error.category,
          severity: error.severity
        })
      },
      { status: statusCode }
    );
  }

  // Graceful degradation handler
  async handleWithGracefulDegradation<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    context: Partial<EnterpriseError['context']> = {},
    operationName: string = 'unknown'
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      await this.handleError(error, {
        ...context,
        operation: operationName
      });

      // Try fallback
      try {
        console.log(`Attempting graceful degradation for ${operationName}`);
        return await fallback();
      } catch (fallbackError: any) {
        await this.handleError(fallbackError, {
          ...context,
          operation: `${operationName}_fallback`
        }, { isFallbackError: true });

        // Return default value or throw
        throw new Error(`Both primary and fallback operations failed for ${operationName}`);
      }
    }
  }

  // Circuit breaker pattern implementation
  private circuitBreakerStates = new Map<string, {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: number;
    timeout: number;
  }>();

  async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitName: string,
    options: {
      failureThreshold?: number;
      timeout?: number;
      resetTimeout?: number;
    } = {}
  ): Promise<T> {
    const {
      failureThreshold = 5,
      timeout = 60000,
      resetTimeout = 30000
    } = options;

    const state = this.circuitBreakerStates.get(circuitName) || {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      timeout
    };

    // Check if circuit is open
    if (state.isOpen) {
      if (Date.now() - state.lastFailureTime > resetTimeout) {
        // Try to close circuit
        state.isOpen = false;
        state.failureCount = 0;
        console.log(`Circuit breaker for ${circuitName} attempting to close`);
      } else {
        throw new Error(`Circuit breaker for ${circuitName} is open`);
      }
    }

    try {
      const result = await operation();
      
      // Reset on success
      if (state.failureCount > 0) {
        state.failureCount = 0;
        console.log(`Circuit breaker for ${circuitName} reset after success`);
      }
      
      this.circuitBreakerStates.set(circuitName, state);
      return result;
    } catch (error: any) {
      state.failureCount++;
      state.lastFailureTime = Date.now();

      if (state.failureCount >= failureThreshold) {
        state.isOpen = true;
        console.error(`Circuit breaker for ${circuitName} opened after ${state.failureCount} failures`);
        
        await this.handleError(error, {
          operation: circuitName,
          circuitBreakerOpened: true
        }, { failureCount: state.failureCount });
      }

      this.circuitBreakerStates.set(circuitName, state);
      throw error;
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Helper function to wrap API handlers with error handling
export function withErrorHandling(
  handler: (request: Request, context?: any) => Promise<Response>,
  options: {
    context?: Partial<EnterpriseError['context']>;
    circuitBreaker?: string;
    fallback?: () => Promise<Response>;
  } = {}
) {
  return async (request: Request, context?: any): Promise<Response> => {
    try {
      if (options.circuitBreaker) {
        return await errorHandler.withCircuitBreaker(
          () => handler(request, context),
          options.circuitBreaker
        );
      }

      return await handler(request, context);
    } catch (error: any) {
      const enterpriseError = await errorHandler.handleError(
        error,
        {
          ...options.context,
          endpoint: new URL(request.url).pathname,
          method: request.method
        }
      );

      if (options.fallback) {
        try {
          console.log('Attempting fallback operation');
          return await options.fallback();
        } catch (fallbackError: any) {
          await errorHandler.handleError(fallbackError, {
            ...options.context,
            operation: 'fallback'
          });
        }
      }

      return errorHandler.createErrorResponse(enterpriseError);
    }
  };
}
