# 🔑 Complete Environment Variables Reference

**Last Updated:** January 19, 2026  
**Environment:** Production

---

## 📋 Quick Setup

Copy these to your `.env.local` (development) or production environment:

```bash
# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://your-project.supabase.co/functions/v1

# ============================================
# AUTHENTICATION
# ============================================
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ============================================
# PAYMENT PROCESSING (STRIPE)
# ============================================
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_CONNECT_CLIENT_ID=ca_your_connect_id_here

# ============================================
# SMS SERVICES
# ============================================
# Sinch (for booking reminders)
SINCH_API_TOKEN=your-sinch-api-token
SINCH_SERVICE_PLAN_ID=your-service-plan-id
SINCH_PHONE_NUMBER=+1234567890

# Twilio (for notifications)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# ============================================
# EMAIL SERVICE (BREVO)
# ============================================
BREVO_API_KEY=xkeysib-your-brevo-api-key
BREVO_SMTP_KEY=your-smtp-key
BREVO_FROM_EMAIL=noreply@gulfcoastcharters.com
BREVO_FROM_NAME=Gulf Coast Charters

# ============================================
# WEATHER API
# ============================================
NOAA_API_KEY=your-noaa-api-key
NOAA_BASE_URL=https://api.weather.gov

# ============================================
# USCG INTEGRATION
# ============================================
USCG_API_KEY=your-uscg-api-key
USCG_API_URL=https://api.uscg.gov

# ============================================
# AI SERVICES
# ============================================
GATEWAY_API_KEY=your-gateway-api-key
GATEWAY_API_URL=https://api.gateway.ai
GOOGLE_VISION_API_KEY=your-vision-api-key

# ============================================
# APPLICATION SETTINGS
# ============================================
NEXT_PUBLIC_SITE_URL=https://gulfcoastcharters.com
NEXT_PUBLIC_APP_NAME=Gulf Coast Charters
NEXT_PUBLIC_APP_ENV=production

# ============================================
# ERROR TRACKING (SENTRY)
# ============================================
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# ============================================
# FIREBASE (PUSH NOTIFICATIONS)
# ============================================
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
FIREBASE_SERVER_KEY=your-firebase-server-key
```

---

## 🔐 Supabase Edge Functions Secrets

Set these in Supabase Dashboard → Edge Functions → Secrets:

```bash
# Core
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SMS
SINCH_API_TOKEN=your-sinch-token
SINCH_SERVICE_PLAN_ID=your-plan-id
SINCH_PHONE_NUMBER=+1234567890
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Payments
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email
BREVO_API_KEY=your-brevo-key

# Weather
NOAA_API_KEY=your-noaa-key

# AI
GATEWAY_API_KEY=your-gateway-key

# Site
SITE_URL=https://gulfcoastcharters.com
```

---

## 📝 Variable Descriptions

### Supabase
- **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Public anonymous key (safe for client-side)
- **SUPABASE_SERVICE_ROLE_KEY**: Service role key (server-side only, never expose)

### Stripe
- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: Public key for client-side
- **STRIPE_SECRET_KEY**: Secret key for server-side (use `sk_live_` for production)
- **STRIPE_WEBHOOK_SECRET**: Webhook signing secret
- **STRIPE_CONNECT_CLIENT_ID**: For captain payouts

### SMS Services
- **SINCH_***: For booking reminder SMS
- **TWILIO_***: For general SMS notifications

### Email
- **BREVO_API_KEY**: Brevo (Sendinblue) API key
- **BREVO_SMTP_KEY**: SMTP authentication key
- **BREVO_FROM_EMAIL**: Default sender email

### Weather
- **NOAA_API_KEY**: National Oceanic and Atmospheric Administration API key

### AI Services
- **GATEWAY_API_KEY**: AI Gateway for image generation
- **GOOGLE_VISION_API_KEY**: Google Cloud Vision for fish recognition

---

## ✅ Verification Checklist

After setting environment variables:

- [ ] All `NEXT_PUBLIC_*` variables set (client-side)
- [ ] All server-side variables set (not `NEXT_PUBLIC_*`)
- [ ] Supabase keys verified
- [ ] Stripe keys verified (production keys)
- [ ] SMS service keys verified
- [ ] Email service keys verified
- [ ] Edge function secrets set in Supabase dashboard
- [ ] No development keys in production
- [ ] All keys tested and working

---

## 🔒 Security Notes

1. **Never commit `.env.local`** to git
2. **Use production keys** only in production
3. **Rotate keys** regularly
4. **Monitor key usage** for anomalies
5. **Use environment-specific** configurations
6. **Store secrets** in secure vaults (not in code)

---

**Ready for deployment!** ✅
