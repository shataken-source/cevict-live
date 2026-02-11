'use client';

import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const r = localStorage.getItem('praxis-settings');
    if (!r) return 'dark';
    const p = JSON.parse(r);
    return p?.display?.theme === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getStoredTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    const onSaved = () => setTheme(getStoredTheme());
    window.addEventListener('praxis-settings-saved', onSaved);
    return () => window.removeEventListener('praxis-settings-saved', onSaved);
  }, []);

  // Avoid flash: only apply theme class after we've read from localStorage
  const themeClass = mounted ? `praxis-theme-${theme}` : 'praxis-theme-dark';

  return <div className={themeClass}>{children}</div>;
}
