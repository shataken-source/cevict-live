/**
 * SSO Validation Page
 * Validates SSO token and creates local session
 * /sso/validate?token=xxx
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';

export default function SSOValidatePage() {
  const router = useRouter();
  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating');
  const [message, setMessage] = useState('Validating SSO token...');

  useEffect(() => {
    const validateToken = async () => {
      const { token } = router.query;
      
      if (!token || typeof token !== 'string') {
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

        // Create local Supabase session
        // Note: In a real implementation, you'd exchange the token for a Supabase session
        // For now, we'll just redirect to login if not already authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && user.id === data.user.id) {
          // Already logged in as the same user
          setStatus('success');
          setMessage('SSO validated! Redirecting...');
          setTimeout(() => {
            router.push('/');
          }, 1500);
        } else {
          // Need to log in - redirect to login with message
          setStatus('error');
          setMessage('Please log in to complete SSO. Redirecting to login...');
          setTimeout(() => {
            router.push('/admin/login?redirect=/');
          }, 2000);
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(`Error: ${error.message}`);
      }
    };

    if (router.isReady) {
      validateToken();
    }
  }, [router.isReady, router.query]);

  return (
    <>
      <Head>
        <title>SSO Validation | GCC</title>
      </Head>
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
    </>
  );
}
