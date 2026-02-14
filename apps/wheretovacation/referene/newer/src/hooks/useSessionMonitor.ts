import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface SessionPreferences {
  timeoutDuration: number; // seconds
  warningDuration: number; // seconds
  autoExtend: boolean;
}

const DEFAULT_PREFERENCES: SessionPreferences = {
  timeoutDuration: 1800, // 30 minutes
  warningDuration: 120, // 2 minutes
  autoExtend: false
};

export function useSessionMonitor() {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [preferences, setPreferences] = useState<SessionPreferences>(DEFAULT_PREFERENCES);
  const lastActivityRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Load preferences from localStorage
  const loadPreferences = useCallback(() => {
    const stored = localStorage.getItem('sessionPreferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch {
        setPreferences(DEFAULT_PREFERENCES);
      }
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((prefs: SessionPreferences) => {
    localStorage.setItem('sessionPreferences', JSON.stringify(prefs));
    setPreferences(prefs);
  }, []);

  // Reset activity timer
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);

    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    // Set warning timer
    const warningTime = (preferences.timeoutDuration - preferences.warningDuration) * 1000;
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(preferences.warningDuration);
    }, warningTime);

    // Set logout timer
    const logoutTime = preferences.timeoutDuration * 1000;
    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
    }, logoutTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences.timeoutDuration, preferences.warningDuration]);


  // Handle logout
  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    await supabase.auth.signOut();
    navigate('/');
  }, [navigate]);

  // Handle session extension
  const handleExtend = useCallback(async () => {
    try {
      await supabase.functions.invoke('session-manager', {
        body: { action: 'extend_session' }
      });
      resetActivity();
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  }, [resetActivity]);

  // Track user activity
  useEffect(() => {
    loadPreferences();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      // Only reset if more than 1 second has passed (debounce)
      if (timeSinceLastActivity > 1000) {
        if (preferences.autoExtend && !showWarning) {
          resetActivity();
        } else if (!showWarning) {
          lastActivityRef.current = now;
        }
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initialize timers
    resetActivity();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [preferences, showWarning, resetActivity, loadPreferences]);

  return {
    showWarning,
    remainingSeconds,
    preferences,
    savePreferences,
    handleExtend,
    handleLogout
  };
}
