'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextValue {
  zipCode: string;
  setZipCode: (zip: string) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  zipCode: '90210',
  setZipCode: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [zipCode, setZipCodeState] = useState('90210');

  useEffect(() => {
    const stored = localStorage.getItem('accusolar_zip');
    if (stored) setZipCodeState(stored);
  }, []);

  const setZipCode = (zip: string) => {
    setZipCodeState(zip);
    localStorage.setItem('accusolar_zip', zip);
  };

  return (
    <SettingsContext.Provider value={{ zipCode, setZipCode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
