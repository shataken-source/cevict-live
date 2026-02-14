'use client';

import { useEffect } from 'react';

const LAUNCHPAD_COMMAND_CENTER =
  (typeof window !== 'undefined' && (window as any).__LAUNCHPAD_CC_URL__) ||
  process.env.NEXT_PUBLIC_LAUNCHPAD_URL ||
  'http://localhost:3001';

export default function CommandCenterRedirect() {
  useEffect(() => {
    window.location.href = `${LAUNCHPAD_COMMAND_CENTER.replace(/\/$/, '')}/command-center`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center p-8">
        <p className="text-lg mb-4">Command Center has moved to Launchpad.</p>
        <p className="text-slate-400 mb-6">Redirecting…</p>
        <a
          href={`${LAUNCHPAD_COMMAND_CENTER.replace(/\/$/, '')}/command-center`}
          className="text-blue-400 hover:underline"
        >
          Open Command Center →
        </a>
      </div>
    </div>
  );
}
