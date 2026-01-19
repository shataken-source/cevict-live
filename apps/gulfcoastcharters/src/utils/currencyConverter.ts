/**
 * Currency Conversion Utility
 * 
 * Provides currency conversion and formatting for international bookings.
 * Supports 6 major currencies with automatic language-based currency selection.
 * 
 * Supported Currencies:
 * - USD (US Dollar) - Base currency
 * - EUR (Euro)
 * - GBP (British Pound)
 * - CAD (Canadian Dollar)
 * - MXN (Mexican Peso)
 * - BRL (Brazilian Real)
 * 
 * Exchange Rate Sources:
 * @see https://www.xe.com/ - For current exchange rates
 * @see https://exchangeratesapi.io/ - API for real-time rates (future integration)
 * 
 * Note: Exchange rates are currently static. For production, integrate with:
 * - https://exchangeratesapi.io/
 * - https://openexchangerates.org/
 * - https://fixer.io/
 */

// Exchange rates relative to USD (base currency)
// TODO: Replace with API call for real-time rates in production
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,      // US Dollar (base)
  EUR: 0.92,   // Euro
  GBP: 0.79,   // British Pound
  CAD: 1.36,   // Canadian Dollar
  MXN: 17.08,  // Mexican Peso
  BRL: 4.97,   // Brazilian Real
};

/**
 * Convert amount from one currency to another
 * 
 * @param amount - The amount to convert
 * @param from - Source currency code (e.g., 'USD')
 * @param to - Target currency code (e.g., 'EUR')
 * @returns Converted amount
 * 
 * @example
 * convertCurrency(100, 'USD', 'EUR') // Returns ~92.00
 */
export const convertCurrency = (amount: number, from: string, to: string): number => {
  // No conversion needed if currencies are the same
  if (from === to) return amount;
  
  // Convert to USD first (base currency), then to target currency
  const usdAmount = amount / EXCHANGE_RATES[from];
  return usdAmount * EXCHANGE_RATES[to];
};

/**
 * Format currency amount with appropriate symbol and locale
 * 
 * @param amount - The amount to format
 * @param currency - Currency code (e.g., 'USD')
 * @param locale - Optional locale for number formatting
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56, 'USD') // Returns "$1234.56"
 * formatCurrency(1234.56, 'EUR') // Returns "€1234.56"
 */
export const formatCurrency = (amount: number, currency: string, locale?: string): string => {
  // Currency symbols mapping
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
    MXN: 'MX$',
    BRL: 'R$',
  };

  const symbol = currencySymbols[currency] || currency;
  
  // Format with 2 decimal places
  return `${symbol}${amount.toFixed(2)}`;
};

/**
 * Get default currency for a given language
 * Automatically selects appropriate currency based on user's language preference
 * 
 * @param language - Language code (e.g., 'en', 'es', 'fr', 'pt')
 * @returns Currency code
 * 
 * @example
 * getCurrencyForLanguage('es') // Returns 'MXN'
 * getCurrencyForLanguage('fr') // Returns 'EUR'
 */
export const getCurrencyForLanguage = (language: string): string => {
  const languageToCurrency: Record<string, string> = {
    en: 'USD',  // English -> US Dollar
    es: 'MXN',  // Spanish -> Mexican Peso
    fr: 'EUR',  // French -> Euro
    pt: 'BRL',  // Portuguese -> Brazilian Real
  };
  
  return languageToCurrency[language] || 'USD';
};
