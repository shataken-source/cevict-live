# Environment Variables Setup Guide - Gulf Coast Charters

## Overview
This guide covers all environment variables needed for local development, staging, and production environments.

## Quick Start

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Fill in your credentials following this guide
3. Never commit `.env.local` or `.env.production` to Git

## Required Environment Variables

### 1. Supabase Configuration

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Setup Instructions:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to Settings > API
4. Copy Project URL and anon/public key
5. Copy service_role key (keep secret!)

### 2. OAuth Providers

#### Google OAuth
```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Setup:** See OAUTH_SETUP.md for detailed instructions

#### Facebook OAuth
```env
VITE_FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-secret
```

### 3. Payment Processing (Stripe)

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Setup:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Get API keys from Developers > API keys
3. Use test keys for development
4. Set up webhooks for production

### 4. Email Service (SendGrid/Resend)

```env
SENDGRID_API_KEY=SG.xxxxx
RESEND_API_KEY=re_xxxxx
VITE_EMAIL_FROM=noreply@gulfcoastcharters.com
```

### 5. SMS Service (Twilio)

```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 6. External APIs

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyxxxxx
VITE_WEATHER_API_KEY=your-weather-api-key
NOAA_API_KEY=your-noaa-key
```

### 7. Security & Monitoring

```env
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
JWT_SECRET=your-secure-random-string
ENCRYPTION_KEY=your-encryption-key
```

### 8. Feature Flags

```env
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_CHAT=true
VITE_MAINTENANCE_MODE=false
```

## Environment-Specific Setup

### Local Development (.env.local)
```env
NODE_ENV=development
VITE_APP_URL=http://localhost:5173
VITE_SUPABASE_URL=https://dev-project.supabase.co
# Use test/sandbox keys for all services
```

### Staging (.env.staging)
```env
NODE_ENV=staging
VITE_APP_URL=https://staging.gulfcoastcharters.com
VITE_SUPABASE_URL=https://staging-project.supabase.co
# Use test keys with staging data
```

### Production (.env.production)
```env
NODE_ENV=production
VITE_APP_URL=https://gulfcoastcharters.com
VITE_SUPABASE_URL=https://prod-project.supabase.co
# Use live production keys
```

## Security Best Practices

1. **Never commit secrets to Git**
2. **Use different keys per environment**
3. **Rotate keys regularly (quarterly)**
4. **Store production keys in Vercel/Netlify dashboard**
5. **Use service role key only in backend/edge functions**
6. **Enable IP restrictions where possible**
7. **Monitor API usage for anomalies**

## Setting Variables in Vercel

1. Go to Project Settings > Environment Variables
2. Add each variable with appropriate scope:
   - Production
   - Preview (staging)
   - Development
3. Redeploy after adding variables

## Setting Variables in Netlify

1. Go to Site Settings > Environment Variables
2. Add variables for each deploy context
3. Trigger new deployment

## Verification Checklist

- [ ] Supabase connection working
- [ ] OAuth login functional
- [ ] Payment processing enabled
- [ ] Emails sending successfully
- [ ] SMS notifications working
- [ ] Maps displaying correctly
- [ ] Weather data loading
- [ ] Error tracking active

## Troubleshooting

### Issue: "Invalid API Key"
- Verify key is copied correctly (no extra spaces)
- Check key is for correct environment
- Ensure key hasn't expired

### Issue: OAuth Not Working
- Verify redirect URLs match exactly
- Check client ID/secret are correct
- Ensure OAuth app is published/approved

### Issue: Emails Not Sending
- Verify sender email is verified
- Check API key permissions
- Review email service logs

## Getting Help

- Check service-specific documentation
- Review error logs in Sentry
- Contact support for each service
- See OAUTH_SETUP.md, DEPLOYMENT_GUIDE.md

## Security Incident Response

If keys are compromised:
1. Immediately revoke/rotate affected keys
2. Check logs for unauthorized access
3. Update keys in all environments
4. Monitor for unusual activity
5. Document incident

---

Last Updated: November 2025
