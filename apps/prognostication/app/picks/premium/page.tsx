'use client';

import { useEffect } from 'react';

/**
 * Premium/pro picks live at /my-picks (tier-gated).
 * This route redirects so one canonical place for paid picks.
 */
export default function PicksPremiumRedirect() {
  useEffect(() => {
    window.location.replace('/my-picks');
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Redirecting to your picks…</p>
    </div>
  );
}
