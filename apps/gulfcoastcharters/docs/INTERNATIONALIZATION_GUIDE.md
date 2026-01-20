# Internationalization (i18n) Implementation Guide

## Overview
Gulf Coast Charters now supports 4 languages: English, Spanish, French, and Portuguese with automatic browser detection and currency conversion.

## Features Implemented

### 1. Language Support
- **English (en)** - Default, USD currency
- **Spanish (es)** - MXN currency
- **French (fr)** - EUR currency  
- **Portuguese (pt)** - BRL currency

### 2. Auto-Detection
- Browser language automatically detected on first visit
- User preference stored in localStorage
- Language persists across sessions

### 3. Currency Conversion
- Real-time currency conversion utility
- Auto-switches currency based on language
- Supports: USD, EUR, GBP, CAD, MXN, BRL
- Manual currency override available

### 4. Translation Files
Located in `src/translations/`:
- `en.ts` - English translations
- `es.ts` - Spanish translations
- `fr.ts` - French translations
- `pt.ts` - Portuguese translations

### 5. Components Updated
- **LanguageSwitcher**: Dropdown with language and currency selection
- **NavigationEnhanced**: Includes language switcher in header
- **I18nContext**: Manages language state and translations

### 6. Multilingual Templates

#### Email Templates:
- `WelcomeEmail.tsx` - New user onboarding
- `BookingConfirmationEmail.tsx` - Booking confirmations
- `PromotionalEmail.tsx` - Marketing campaigns
- `BookingReminderEmail.tsx` - Pre-trip reminders

#### SMS Templates:
- `MultilingualSMSTemplates.tsx` - All SMS campaign types
- Booking confirmations, reminders, deals, weather alerts

### 7. Fishy AI Assistant
- Responds in user's selected language
- Comprehensive platform knowledge
- Web search capability for external info
- Multilingual system prompts

## Usage

### In Components:
```tsx
import { useI18n } from '@/contexts/I18nContext';

function MyComponent() {
  const { t, language, setLanguage, currency, setCurrency } = useI18n();
  
  return (
    <div>
      <h1>{t('hero.title')}</h1>
      <p>{t('common.loading')}</p>
      <button onClick={() => setLanguage('es')}>Español</button>
    </div>
  );
}
```

### Currency Conversion:
```tsx
import { convertCurrency, formatCurrency } from '@/utils/currencyConverter';

const priceInUSD = 100;
const priceInEUR = convertCurrency(priceInUSD, 'USD', 'EUR');
const formatted = formatCurrency(priceInEUR, 'EUR'); // "€92.00"
```

### Email Templates:
```tsx
import { WelcomeEmail } from '@/components/email-templates/WelcomeEmail';

const html = WelcomeEmail({ 
  userName: 'John', 
  language: 'es' 
});
```

### SMS Templates:
```tsx
import { smsTemplates } from '@/components/email-templates/MultilingualSMSTemplates';

const message = smsTemplates.bookingConfirmation.es('Maria', 'Dec 25');
```

## Adding New Languages

1. Create translation file: `src/translations/xx.ts`
2. Add to I18nContext: `type Language = 'en' | 'es' | 'fr' | 'pt' | 'xx'`
3. Import in I18nContext: `import { xx } from '@/translations/xx'`
4. Add to translations object: `const translations = { en, es, fr, pt, xx }`
5. Update LanguageSwitcher with new language option
6. Add currency mapping in `currencyConverter.ts`

## Best Practices

1. **Always use translation keys**: Never hardcode text
2. **Provide fallbacks**: Use English as default
3. **Test all languages**: Verify UI doesn't break with longer text
4. **Currency awareness**: Display prices in user's currency
5. **Date/time formatting**: Use locale-aware formatting
6. **Right-to-left**: Consider RTL languages for future

## Testing

1. Change browser language settings
2. Clear localStorage to test auto-detection
3. Switch languages via UI
4. Verify currency changes with language
5. Test email/SMS templates in all languages
6. Check Fishy AI responses in each language

## Production Checklist

- [ ] All UI text uses translation keys
- [ ] Email templates support all languages
- [ ] SMS templates support all languages
- [ ] Currency conversion tested
- [ ] Language switcher visible in navigation
- [ ] Auto-detection working
- [ ] Fishy AI responds in correct language
- [ ] All 4 languages tested end-to-end

## Future Enhancements

- Add more languages (German, Italian, Chinese, Japanese)
- Real-time exchange rate API integration
- Professional translation service integration
- Content management system for translations
- A/B testing for different translations
- Regional dialect support (Latin American vs Spain Spanish)
