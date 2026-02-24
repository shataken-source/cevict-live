'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-16 h-16 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">
            We encountered an unexpected error. Our team has been notified.
          </p>
          {error.message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 font-mono">
                {error.message}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Button 
            onClick={reset}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <Link href="/">
            <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-red-200">
          <p className="text-sm text-gray-500 mb-4">
            Need help? Contact our support team:
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              📧 support@gulfcoastcharters.com
            </p>
            <p className="text-gray-600">
              📞 1-800-GCC-FISH
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
