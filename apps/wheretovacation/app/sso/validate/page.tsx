/**
 * SSO Validation Page (WTV)
 * Validates SSO token and creates local session
 * /sso/validate?token=xxx
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function SSOValidateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating');
  const [message, setMessage] = useState('Validating SSO token...');

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('No token provided');
        return;
      }

      try {
        // Validate token with backend
        const response = await fetch(`/api/sso/validate?token=${token}`);
        const data = await response.json();

        if (!data.success) {
          setStatus('error');
          setMessage(data.error || 'Invalid token');
          return;
        }

        // Token is valid – hand off to the normal login flow with context
        setStatus('success');
        setMessage('SSO validated. Redirecting you to sign in...');

        const next =
          searchParams.get('redirect') ||
          searchParams.get('next') ||
          '/';

        const params = new URLSearchParams();
        params.set('redirect', next);
        if (data.user?.email) {
          params.set('email', data.user.email);
          params.set('sso', '1');
        }

        router.push(`/auth/login?${params.toString()}`);
      } catch (error: any) {
        setStatus('error');
        setMessage(`Error: ${error.message}`);
      }
    };

    validateToken();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">SSO Validation</h1>
        <div className="mb-4">
          {status === 'validating' && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          )}
          {status === 'success' && (
            <div className="text-green-600 text-4xl mb-2">✅</div>
          )}
          {status === 'error' && (
            <div className="text-red-600 text-4xl mb-2">❌</div>
          )}
        </div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export default function SSOValidatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">SSO Validation</h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    }>
      <SSOValidateContent />
    </Suspense>
  );
}
