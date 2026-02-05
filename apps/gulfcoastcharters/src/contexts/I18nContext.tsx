/**
 * Internationalization (i18n) Context
 * 
 * Provides multi-language support for the entire application with automatic
 * browser language detection and persistent user preferences.
 * 
 * Supported Languages:
 * - English (en) - Default
 * - Spanish (es)
 * - French (fr)
 * - Portuguese (pt)
 * 
 * Features:
 * - Automatic browser language detection
 * - Persistent language preference (localStorage)
 * - Currency management tied to language
 * - Nested translation key support (e.g., 'nav.home')
 * 
 * Translation Libraries:
 * @see https://react.i18next.com/ - Alternative i18n solution
 * @see https://formatjs.io/docs/react-intl/ - React Intl library
 * 
 * Usage:
 * ```tsx
 * const { t, language, setLanguage } = useI18n();
 * <h1>{t('welcome.title')}</h1>
 * ```
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '@/translations/en';
import { es } from '@/translations/es';
import { fr } from '@/translations/fr';
import { pt } from '@/translations/pt';

// Supported language codes
type Language = 'en' | 'es' | 'fr' | 'pt';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  currency: string;
  setCurrency: (curr: string) => void;
}

// Translation objects for all supported languages
const translations: Record<Language, Record<string, unknown>> = { en, es, fr, pt };


const I18nContext = createContext<I18nContextType | undefined>(undefined);

/**
 * Hook to access i18n context
 * @throws Error if used outside I18nProvider
 */
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
};

/**
 * I18n Provider Component
 * Wraps the app to provide translation and language management
 */
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize language with priority: localStorage > browser language > default (en)
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    const saved = localStorage.getItem('language');
    if (saved && ['en', 'es', 'fr', 'pt'].includes(saved)) return saved as Language;
    
    // Detect browser language (e.g., 'en-US' -> 'en')
    const browserLang = navigator.language.split('-')[0];
    if (['en', 'es', 'fr', 'pt'].includes(browserLang)) return browserLang as Language;
    
    // Default to English
    return 'en';
  });

  // Initialize currency from localStorage or default to USD
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('currency') || 'USD';
  });

  /**
   * Set language and persist to localStorage
   */
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  /**
   * Set currency and persist to localStorage
   */
  const setCurrency = (curr: string) => {
    setCurrencyState(curr);
    localStorage.setItem('currency', curr);
  };

  /**
   * Translation function - supports nested keys with dot notation
   * @param key - Translation key (e.g., 'nav.home' or 'welcome.title')
   * @returns Translated string or key if translation not found
   */
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: Record<string, unknown> | string = translations[language] as Record<string, unknown>;

    
    // Navigate through nested object
    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in value) {
        value = value[k] as Record<string, unknown> | string;
      } else {
        return key;
      }
    }
    
    // Return translation or original key if not found
    return typeof value === 'string' ? value : key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, currency, setCurrency }}>
      {children}
    </I18nContext.Provider>
  );
};

