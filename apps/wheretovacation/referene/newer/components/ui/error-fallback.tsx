import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  message?: string;
}

export function ErrorFallback({ 
  error, 
  resetError, 
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.'
}: ErrorFallbackProps) {
  return (
    <Card className="p-6 text-center">
      <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{message}</p>
      {error && process.env.NODE_ENV === 'development' && (
        <pre className="text-xs text-left bg-gray-100 p-3 rounded mb-4 overflow-auto">
          {error.message}
        </pre>
      )}
      {resetError && (
        <Button onClick={resetError} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </Card>
  );
}
