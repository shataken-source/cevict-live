/**
 * SiteSettingsContext
 * 
 * Enterprise-grade global site configuration management
 * Handles company info, contact details, social media links, and API keys
 * Persists settings to localStorage for offline access
 * 
 * @context
 */

import { createContext, useContext, useState, ReactNode } from 'react';

interface SiteSettings {
  companyName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  facebook: string;
  twitter: string;
  instagram: string;
  tiktok: string;
  truthsocial: string;
  linkedin: string;
  youtube: string;
  firebaseServerKey: string;
}

const defaultSettings: SiteSettings = {
  companyName: 'Gulf Coast Charters',
  tagline: 'Premier Fishing Adventures',
  email: 'info@gulfcoastcharters.com',
  phone: '+18885551234',
  address: 'Gulf Coast Region, USA',
  facebook: 'https://facebook.com/gulfcoastcharters',
  twitter: 'https://twitter.com/gulfcoastcharters',
  instagram: 'https://instagram.com/gulfcoastcharters',
  tiktok: 'https://tiktok.com/@gulfcoastcharters',
  truthsocial: 'https://truthsocial.com/@gulfcoastcharters',
  linkedin: 'https://linkedin.com/company/gulfcoastcharters',
  youtube: 'https://youtube.com/@gulfcoastcharters',
  firebaseServerKey: '',
};



const SiteSettingsContext = createContext<{
  settings: SiteSettings;
  updateSettings: (newSettings: Partial<SiteSettings>) => void;
}>({
  settings: defaultSettings,
  updateSettings: () => {},
});

export const useSiteSettings = () => useContext(SiteSettingsContext);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const saved = localStorage.getItem('siteSettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const updateSettings = (newSettings: Partial<SiteSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('siteSettings', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <SiteSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
