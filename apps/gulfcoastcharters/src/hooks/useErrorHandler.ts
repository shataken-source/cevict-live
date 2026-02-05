import { useState, useCallback } from 'react';
import { logError, ErrorContext } from '@/lib/errorLogger';
import { toast } from 'sonner';

interface UseErrorHandlerOptions {
  context?: ErrorContext;
  showToast?: boolean;
  onError?: (error: Error) => void;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const [error, setError] = useState<Error | null>(null);
  const [isError, setIsError] = useState(false);

  const handleError = useCallback((err: Error | unknown, customContext?: ErrorContext) => {
    const error = err instanceof Error ? err : new Error(String(err));
    
    setError(error);
    setIsError(true);

    logError(error, { ...options.context, ...customContext });

    if (options.showToast !== false) {
      toast.error(error.message || 'An error occurred');
    }

    options.onError?.(error);
  }, [options]);

  const clearError = useCallback(() => {
    setError(null);
    setIsError(false);
  }, []);

  return { error, isError, handleError, clearError };
}
