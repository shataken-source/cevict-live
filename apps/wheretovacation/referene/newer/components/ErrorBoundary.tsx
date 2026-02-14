'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; reset: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Error caught by boundary:', error, errorInfo);
      // In production, you would send this to Sentry, LogRocket, etc.
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} reset={this.handleReset} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, reset }: { error?: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-pink-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
        <p className="text-red-200 mb-6">
          We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.
        </p>
        
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-6 text-left">
            <summary className="text-red-300 cursor-pointer mb-2">Error Details</summary>
            <pre className="text-xs text-red-400 bg-black/20 p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
        
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            Try Again
          </button>
          <a
            href="/"
            className="block w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
