'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to check if user has passed age verification
 * Components can use this to conditionally enable/disable features
 */
export function useAgeVerification() {
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkVerification = () => {
      const cookies = document.cookie.split(';');
      const ageVerified = cookies.some(cookie =>
        cookie.trim().startsWith('age_verified=yes') ||
        cookie.trim().startsWith('age_verified=true')
      );
      setIsVerified(ageVerified);
      setIsChecking(false);
    };

    // Check immediately
    checkVerification();

    // Listen for age verification event
    const handleAgeVerified = () => {
      setIsVerified(true);
      setIsChecking(false);
    };

    window.addEventListener('ageVerified', handleAgeVerified);

    // Also check periodically in case cookie was set elsewhere
    const interval = setInterval(checkVerification, 1000);

    return () => {
      window.removeEventListener('ageVerified', handleAgeVerified);
      clearInterval(interval);
    };
  }, []);

  return { isVerified, isChecking };
}

