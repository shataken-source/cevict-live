import { useUser } from '@/contexts/UserContext';
import { useCallback } from 'react';

interface UseRequireAuthReturn {
  requireAuth: (action: () => void, message?: string) => void;
  isAuthenticated: boolean;
}

export function useRequireAuth(): UseRequireAuthReturn {
  const { isAuthenticated } = useUser();

  const requireAuth = useCallback((action: () => void, message?: string) => {
    if (isAuthenticated) {
      action();
    } else {
      // Store the intended action and message
      sessionStorage.setItem('authReturnAction', 'true');
      if (message) {
        sessionStorage.setItem('authMessage', message);
      }
      
      // Trigger auth modal by dispatching custom event
      window.dispatchEvent(new CustomEvent('openAuthModal'));
    }
  }, [isAuthenticated]);

  return { requireAuth, isAuthenticated };
}
