"use client";

import { useEffect } from 'react';

export default function ChartersPage() {
  useEffect(() => {
    // Redirect to GCC for charter features
    if (typeof window !== 'undefined') {
      const gccUrl = process.env.NEXT_PUBLIC_GCC_URL || 'http://localhost:3004';
      window.location.href = `${gccUrl}/charters`;
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-4">Redirecting to Gulf Coast Charters...</p>
        <p className="text-sm text-gray-400">Charter features are available on our sister site</p>
      </div>
    </div>
  );
}
