# Developer Resources & Documentation

**Gulf Coast Charters - Complete Reference Guide**

This document contains all URLs, API references, and resources needed for development, deployment, and maintenance.

---

## 🚀 Quick Start

### Essential URLs
- **Live Site**: https://gulfcoastcharters.com (or your domain)
- **Supabase Dashboard**: https://supabase.com/dashboard
- **GitHub Repository**: https://github.com/yourusername/gulf-coast-charters
- **Vercel/Netlify Dashboard**: https://vercel.com/dashboard

---

## 📚 Core Technologies

### React & Build Tools
- **React Documentation**: https://react.dev/
- **Vite Documentation**: https://vitejs.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

### UI Framework
- **Tailwind CSS**: https://tailwindcss.com/docs
- **shadcn/ui Components**: https://ui.shadcn.com/docs
- **Lucide Icons**: https://lucide.dev/icons

### State Management
- **Zustand**: https://github.com/pmndrs/zustand
- **React Context API**: https://react.dev/reference/react/useContext

---

## 🗄️ Backend & Database

### Supabase (Primary Backend)
- **Main Documentation**: https://supabase.com/docs
- **JavaScript Client**: https://supabase.com/docs/reference/javascript
- **Authentication**: https://supabase.com/docs/guides/auth
- **Database (PostgreSQL)**: https://supabase.com/docs/guides/database
- **Row Level Security**: https://supabase.com/docs/guides/database/postgres/row-level-security
- **Edge Functions**: https://supabase.com/docs/guides/functions
- **Storage**: https://supabase.com/docs/guides/storage
- **Realtime**: https://supabase.com/docs/guides/realtime

### Setup Instructions
1. Create project at https://supabase.com/dashboard
2. Get credentials from Settings > API
3. Add to `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## 🤖 AI & Machine Learning

### OpenAI (Fishy AI Assistant)
- **API Documentation**: https://platform.openai.com/docs/api-reference
- **GPT-4 Guide**: https://platform.openai.com/docs/guides/gpt
- **API Keys**: https://platform.openai.com/api-keys
- **Pricing**: https://openai.com/pricing

### Setup
```env
OPENAI_API_KEY=sk-...
```

### Web Search Integration
- **Tavily API**: https://tavily.com/ (for web search in AI)
- **SerpAPI**: https://serpapi.com/ (alternative)

---

## 📧 Email Services

### Mailjet (Transactional Emails)
- **Main Site**: https://www.mailjet.com/
- **API Documentation**: https://dev.mailjet.com/
- **Email API**: https://dev.mailjet.com/email/guides/
- **SMTP Guide**: https://dev.mailjet.com/smtp/
- **Dashboard**: https://app.mailjet.com/

### Setup
```env
MAILJET_API_KEY=your-api-key
MAILJET_SECRET_KEY=your-secret-key
```

### SendGrid (Alternative)
- **Documentation**: https://docs.sendgrid.com/
- **API Reference**: https://docs.sendgrid.com/api-reference

---

## 💳 Payment Processing

### Stripe
- **Main Documentation**: https://stripe.com/docs
- **React Integration**: https://stripe.com/docs/stripe-js/react
- **Checkout**: https://stripe.com/docs/payments/checkout
- **Dashboard**: https://dashboard.stripe.com/
- **Test Cards**: https://stripe.com/docs/testing

### Setup
```env
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

---

## 🌐 Internationalization

### Currency Conversion APIs
- **Exchange Rates API**: https://exchangeratesapi.io/
- **Open Exchange Rates**: https://openexchangerates.org/
- **Fixer.io**: https://fixer.io/
- **XE Currency Data**: https://www.xe.com/xecurrencydata/

### i18n Libraries (Alternatives)
- **react-i18next**: https://react.i18next.com/
- **React Intl**: https://formatjs.io/docs/react-intl/

---

## 🗺️ Maps & Location

### Google Maps
- **JavaScript API**: https://developers.google.com/maps/documentation/javascript
- **Places API**: https://developers.google.com/maps/documentation/places/web-service
- **Geocoding API**: https://developers.google.com/maps/documentation/geocoding

### Mapbox (Alternative)
- **Documentation**: https://docs.mapbox.com/

---

## 🌊 Weather & Marine Data

### NOAA (National Oceanic and Atmospheric Administration)
- **Main API**: https://www.weather.gov/documentation/services-web-api
- **Buoy Data**: https://www.ndbc.noaa.gov/
- **Marine Forecast**: https://www.weather.gov/marine/

### Weather APIs
- **OpenWeatherMap**: https://openweathermap.org/api
- **WeatherAPI**: https://www.weatherapi.com/
- **Visual Crossing**: https://www.visualcrossing.com/

---

## 📱 Progressive Web App (PWA)

### Documentation
- **PWA Basics**: https://web.dev/progressive-web-apps/
- **Service Workers**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **Web App Manifest**: https://developer.mozilla.org/en-US/docs/Web/Manifest
- **Workbox**: https://developers.google.com/web/tools/workbox

### Testing
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse

---

## 🔐 Authentication & Security

### OAuth Providers
- **Google OAuth**: https://developers.google.com/identity/protocols/oauth2
- **Facebook Login**: https://developers.facebook.com/docs/facebook-login
- **Apple Sign In**: https://developer.apple.com/sign-in-with-apple/

### Security Best Practices
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Content Security Policy**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

### WebAuthn (Passkeys)
- **WebAuthn Guide**: https://webauthn.guide/
- **MDN Documentation**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API

---

## 📊 Analytics & Monitoring

### Google Analytics
- **GA4 Documentation**: https://developers.google.com/analytics/devguides/collection/ga4

### Sentry (Error Tracking)
- **Documentation**: https://docs.sentry.io/
- **React Integration**: https://docs.sentry.io/platforms/javascript/guides/react/

### Vercel Analytics
- **Documentation**: https://vercel.com/docs/analytics

---

## 🚢 Deployment

### Vercel
- **Documentation**: https://vercel.com/docs
- **Environment Variables**: https://vercel.com/docs/environment-variables
- **Custom Domains**: https://vercel.com/docs/custom-domains

### Netlify
- **Documentation**: https://docs.netlify.com/
- **Deploy with Git**: https://docs.netlify.com/site-deploys/create-deploys/

### GitHub Actions (CI/CD)
- **Documentation**: https://docs.github.com/en/actions
- **Workflow Syntax**: https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions

---

## 🧪 Testing

### Playwright (E2E Testing)
- **Documentation**: https://playwright.dev/
- **Best Practices**: https://playwright.dev/docs/best-practices

### Vitest (Unit Testing)
- **Documentation**: https://vitest.dev/

---

## 📦 Package Management

### npm
- **Documentation**: https://docs.npmjs.com/

### Package Registry
- **npm Registry**: https://www.npmjs.com/

---

## 🎨 Design Resources

### Color Tools
- **Tailwind Color Generator**: https://uicolors.app/create
- **Coolors**: https://coolors.co/

### Image Optimization
- **TinyPNG**: https://tinypng.com/
- **ImageOptim**: https://imageoptim.com/

---

## 📖 Project-Specific Guides

### Internal Documentation
- `INTERNATIONALIZATION_GUIDE.md` - i18n implementation
- `MENU_AND_CAMPAIGNS_GUIDE.md` - Navigation and email campaigns
- `ENVIRONMENT_VARIABLES_GUIDE.md` - All env vars
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `TESTING_GUIDE.md` - Testing strategies
- `SECURITY_IMPLEMENTATION_GUIDE.md` - Security features

---

## 🆘 Support & Community

### Stack Overflow
- **React**: https://stackoverflow.com/questions/tagged/reactjs
- **Supabase**: https://stackoverflow.com/questions/tagged/supabase
- **Tailwind**: https://stackoverflow.com/questions/tagged/tailwindcss

### Discord Communities
- **Supabase Discord**: https://discord.supabase.com/
- **Reactiflux**: https://www.reactiflux.com/

---

## 📝 Environment Variables Checklist

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# OpenAI
OPENAI_API_KEY=

# Mailjet
MAILJET_API_KEY=
MAILJET_SECRET_KEY=

# Stripe
VITE_STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=

# Google Maps (optional)
VITE_GOOGLE_MAPS_API_KEY=

# Weather API (optional)
VITE_WEATHER_API_KEY=
```

---

## 🔄 Regular Maintenance Tasks

1. **Update Dependencies**: `npm update` monthly
2. **Security Audits**: `npm audit` weekly
3. **Database Backups**: Automated via Supabase
4. **SSL Certificates**: Auto-renewed by hosting provider
5. **API Key Rotation**: Quarterly for production

---

**Last Updated**: November 2025
**Maintained By**: Development Team
