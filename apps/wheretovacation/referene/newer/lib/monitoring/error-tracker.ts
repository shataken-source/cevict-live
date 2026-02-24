/**
 * Centralized Error Tracking
 * Ready for Sentry integration, with fallback to console/logging
 */

export interface ErrorContext {
  userId?: string;
  userEmail?: string;
  page?: string;
  action?: string;
  metadata?: Record<string, any>;
  requestId?: string;
}

export interface ErrorDetails {
  error: string;
  message: string;
  stack?: string;
  context?: ErrorContext;
  timestamp: string;
  environment: string;
  userAgent?: string;
}

class ErrorTracker {
  private sentryEnabled = false;
  private sentryDsn: string | null = null;

  constructor() {
    // Check if Sentry is configured
    this.sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || null;
    this.sentryEnabled = !!this.sentryDsn && process.env.NODE_ENV === 'production';
    
    if (this.sentryEnabled) {
      this.initializeSentry();
    }
  }

  private async initializeSentry() {
    try {
      // Dynamic import to avoid bundling in client if not needed
      const Sentry = await import('@sentry/nextjs');
      Sentry.init({
        dsn: this.sentryDsn!,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 0.1, // 10% of transactions
        beforeSend(event) {
          // Filter out sensitive data
          if (event.request?.cookies) {
            delete event.request.cookies;
          }
          return event;
        }
      });
      console.log('✅ Sentry initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Sentry:', error);
      this.sentryEnabled = false;
    }
  }

  async captureException(
    error: Error | unknown,
    context?: ErrorContext
  ): Promise<void> {
    const errorDetails = this.buildErrorDetails(error, context);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🔴 Error:', errorDetails);
    }

    // Send to Sentry if enabled
    if (this.sentryEnabled) {
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(error, {
          tags: {
            environment: process.env.NODE_ENV || 'development',
            page: context?.page,
            action: context?.action
          },
          extra: context?.metadata,
          user: context?.userId ? {
            id: context.userId,
            email: context.userEmail
          } : undefined
        });
      } catch (sentryError) {
        console.error('Failed to send to Sentry:', sentryError);
      }
    }

    // Store in database for analysis (optional)
    await this.storeError(errorDetails);
  }

  async captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: ErrorContext
  ): Promise<void> {
    if (this.sentryEnabled) {
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureMessage(message, {
          level: level as any,
          tags: {
            environment: process.env.NODE_ENV || 'development',
            page: context?.page
          },
          extra: context?.metadata
        });
      } catch (error) {
        console.error('Failed to send message to Sentry:', error);
      }
    }

    // Log to console
    const logMethod = level === 'error' ? console.error : level === 'warning' ? console.warn : console.log;
    logMethod(`[${level.toUpperCase()}] ${message}`, context);
  }

  private buildErrorDetails(error: Error | unknown, context?: ErrorContext): ErrorDetails {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    return {
      error: errorObj.name,
      message: errorObj.message,
      stack: errorObj.stack,
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    };
  }

  private async storeError(details: ErrorDetails): Promise<void> {
    // Store in localStorage for client-side errors (dev only)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      try {
        const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
        errors.push(details);
        // Keep only last 50 errors
        const recentErrors = errors.slice(-50);
        localStorage.setItem('app_errors', JSON.stringify(recentErrors));
      } catch (e) {
        // Ignore localStorage errors
      }
    }

    // In production, you might want to send to a logging service
    // or store in database via API
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// Convenience functions
export async function logError(error: Error | unknown, context?: ErrorContext): Promise<void> {
  await errorTracker.captureException(error, context);
}

export async function logWarning(message: string, context?: ErrorContext): Promise<void> {
  await errorTracker.captureMessage(message, 'warning', context);
}

export async function logInfo(message: string, context?: ErrorContext): Promise<void> {
  await errorTracker.captureMessage(message, 'info', context);
}












