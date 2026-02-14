"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CaptainsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to GCC for captain features
    // In production, this would redirect to gulfcoastcharters.com
    if (typeof window !== 'undefined') {
      const gccUrl = process.env.NEXT_PUBLIC_GCC_URL || 'http://localhost:3004';
      window.location.href = `${gccUrl}/captains`;
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-4">Redirecting to Gulf Coast Charters...</p>
        <p className="text-sm text-gray-400">Captain features are available on our sister site</p>
      </div>
    </div>
  );
}
