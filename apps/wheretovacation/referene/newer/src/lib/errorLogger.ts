export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;

}

export const logError = (error: Error, context?: ErrorContext) => {
  console.error('Error:', error.message, context);
  
  if (import.meta.env.PROD) {
    // Error logging disabled - Sentry not configured
    console.error('Production error:', error, context);
  }
};

export const logMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: ErrorContext
) => {
  console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](message, context);
  
  if (import.meta.env.PROD) {
    // Message logging disabled - Sentry not configured
  }
};
