/**
 * Language Switcher Component
 * 
 * Provides a dropdown menu for users to select their preferred language and currency.
 * Automatically suggests appropriate currency based on selected language.
 * 
 * Features:
 * - 4 language options with flag emojis
 * - 6 currency options
 * - Automatic currency suggestion based on language
 * - Persistent preferences (via I18nContext)
 * - Responsive design (hides text on mobile)
 * 
 * UI Components:
 * @see https://ui.shadcn.com/docs/components/dropdown-menu - Dropdown menu docs
 * @see https://lucide.dev/icons/globe - Globe icon
 */

import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/contexts/I18nContext';
import { getCurrencyForLanguage } from '@/utils/currencyConverter';

/**
 * Language switcher dropdown component
 * Displays current language flag and currency, allows switching both
 */
export const LanguageSwitcher = () => {
  const { language, setLanguage, currency, setCurrency } = useI18n();

  // Available languages with display names and flag emojis
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
  ];

  // Available currencies
  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'MXN', 'BRL'];

  // Get current language object for display
  const currentLang = languages.find(l => l.code === language);

  /**
   * Handle language change and auto-suggest currency
   * @param langCode - Selected language code
   */
  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode as any);
    
    // Automatically suggest appropriate currency for selected language
    const suggestedCurrency = getCurrencyForLanguage(langCode);
    setCurrency(suggestedCurrency);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          {/* Show flag and currency on desktop, hide on mobile */}
          <span className="hidden sm:inline">{currentLang?.flag} {currency}</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {/* Language Selection Section */}
        <div className="px-2 py-1.5 text-xs font-semibold">Language</div>
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={language === lang.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        {/* Currency Selection Section */}
        <div className="px-2 py-1.5 text-xs font-semibold">Currency</div>
        {currencies.map((curr) => (
          <DropdownMenuItem
            key={curr}
            onClick={() => setCurrency(curr)}
            className={currency === curr ? 'bg-accent' : ''}
          >
            {curr}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;

