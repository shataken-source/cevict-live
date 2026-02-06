'use client';

import { useEffect } from 'react';

/**
 * Canonical free picks page is /free-picks (live API).
 * This route redirects to avoid duplicate content and fake data.
 */
export default function PicksFreeRedirect() {
  useEffect(() => {
    window.location.replace('/free-picks');
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Redirecting to free picks…</p>
    </div>
  );
}
