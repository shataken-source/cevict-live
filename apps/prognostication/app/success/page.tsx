'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [redirecting, setRedirecting] = useState(!!sessionId);

  useEffect(() => {
    if (!sessionId) return;
    const t = setTimeout(() => {
      window.location.href = `/my-picks?session_id=${encodeURIComponent(sessionId)}`;
      setRedirecting(false);
    }, 1500);
    return () => clearTimeout(t);
  }, [sessionId]);

  if (redirecting && sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment successful</h1>
          <p className="text-gray-600 dark:text-slate-400">Taking you to your picks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Thank you</h1>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
          {sessionId ? 'If you are not redirected, use the link below.' : 'Your subscription is active.'}
        </p>
        <Link
          href={sessionId ? `/my-picks?session_id=${encodeURIComponent(sessionId)}` : '/my-picks'}
          className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg"
        >
          View my picks
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Loading...</h1>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
