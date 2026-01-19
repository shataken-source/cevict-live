import { useState, useEffect } from 'react';
import { generateCsrfToken, validateCsrfToken } from '@/lib/security';

/**
 * Custom hook for CSRF-protected forms
 * Generates and validates CSRF tokens for form submissions
 */
export function useSecureForm() {
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    const token = generateCsrfToken();
    setCsrfToken(token);
    sessionStorage.setItem('csrf_token', token);
  }, []);

  const validateSubmission = (submittedToken: string): boolean => {
    const storedToken = sessionStorage.getItem('csrf_token') || '';
    return validateCsrfToken(submittedToken, storedToken);
  };

  return { csrfToken, validateSubmission };
}
