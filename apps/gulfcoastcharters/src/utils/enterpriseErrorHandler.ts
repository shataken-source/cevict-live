import { supabase } from '@/lib/supabase';

export interface ErrorDetails {
  error: string;
  userId?: string;
  userEmail?: string;
  page: string;
  timestamp: string;
  stackTrace?: string;
  userAgent?: string;
}

export async function handleEnterpriseError(
  error: Error | string,
  context?: { page?: string; userId?: string; userEmail?: string }
): Promise<void> {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const stackTrace = typeof error === 'object' && error.stack ? error.stack : undefined;

  const errorDetails: ErrorDetails = {
    error: errorMessage,
    userId: context?.userId,
    userEmail: context?.userEmail,
    page: context?.page || window.location.pathname,
    timestamp: new Date().toISOString(),
    stackTrace,
    userAgent: navigator.userAgent
  };

  // Log to console
  console.error('Enterprise Error:', errorDetails);

  // Send to error notification service
  try {
    await supabase.functions.invoke('error-notification-service', {
      body: errorDetails
    });
  } catch (notificationError) {
    console.error('Failed to send error notification:', notificationError);
  }

  // Store in local storage for debugging
  try {
    const errors = JSON.parse(localStorage.getItem('gcc_errors') || '[]');
    errors.push(errorDetails);
    localStorage.setItem('gcc_errors', JSON.stringify(errors.slice(-10))); // Keep last 10 errors
  } catch (storageError) {
    console.error('Failed to store error locally:', storageError);
  }
}

export function setupGlobalErrorHandler(): void {
  window.addEventListener('error', (event) => {
    handleEnterpriseError(event.error || event.message, {
      page: window.location.pathname
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    handleEnterpriseError(event.reason, {
      page: window.location.pathname
    });
  });
}