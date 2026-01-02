'use client';

import { useEffect, useState } from 'react';

interface SimpleAgeGateProps {
  onVerified?: () => void;
}

export default function SimpleAgeGate({ onVerified }: SimpleAgeGateProps) {
  const [show, setShow] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // Check if already verified - check both cookie formats
    const checkCookie = () => {
      const cookies = document.cookie.split(';');
      const ageVerified = cookies.some(cookie =>
        cookie.trim().startsWith('age_verified=yes') ||
        cookie.trim().startsWith('age_verified=true')
      );
      return ageVerified;
    };

    const verified = checkCookie();
    if (!verified) {
      setShow(true);
      // Prevent body scroll and interactions when age gate is shown
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'none';
      // Also set a data attribute for CSS targeting
      document.body.setAttribute('data-age-gate-active', 'true');
    } else {
      setIsVerified(true);
      // Ensure body is unlocked
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      document.body.removeAttribute('data-age-gate-active');
      // Set a global flag that components can check
      (window as any).ageVerified = true;
      onVerified?.();
    }
  }, [onVerified]);

  const handleYes = () => {
    // Set cookie for 1 year (365 days)
    const isProduction = window.location.protocol === 'https:';
    const secureFlag = isProduction ? '; secure' : '';
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    document.cookie = `age_verified=yes; path=/; max-age=${maxAge}${secureFlag}; samesite=strict`;

    // Re-enable body interactions - use explicit values to ensure restoration
    document.body.style.overflow = 'auto';
    document.body.style.pointerEvents = 'auto';
    document.body.removeAttribute('data-age-gate-active');

    // Set global flag for components to check
    (window as any).ageVerified = true;

    // Dispatch custom event so components can listen for verification
    window.dispatchEvent(new CustomEvent('ageVerified', { detail: { verified: true } }));

    setShow(false);
    setIsVerified(true);
    onVerified?.();

    // Force a small delay to ensure DOM updates complete
    setTimeout(() => {
      // Double-check that body is unlocked
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    }, 100);
  };

  const handleNo = () => {
    // Redirect away or show message
    alert('You must be 21 or older to access this site.');
    // Keep body locked when redirecting
    document.body.style.overflow = 'hidden';
    document.body.style.pointerEvents = 'none';
    window.location.href = 'https://www.google.com';
  };

  // Don't render if verified or not showing
  // But ensure body is unlocked if we're not showing
  if (!show || isVerified) {
    // Make sure body is unlocked when gate is hidden
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      document.body.removeAttribute('data-age-gate-active');
    }
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75"
      data-age-gate-modal="true"
      style={{ pointerEvents: 'auto' }}
      onClick={(e) => {
        // Prevent closing when clicking outside the modal
        e.stopPropagation();
      }}
    >
      <div
        className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl"
        data-age-gate-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">
          Are you 21 or older?
        </h2>
        <p className="text-center text-gray-600 mb-6">
          You must be 21 or older to access this website.
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleNo}
            className="px-8 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition-colors text-gray-900"
            type="button"
          >
            No
          </button>
          <button
            onClick={handleYes}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            type="button"
            autoFocus
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}

