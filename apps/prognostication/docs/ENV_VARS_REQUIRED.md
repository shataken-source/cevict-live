# Prognostication Environment Variables

## Required Environment Variables

### Stripe Payment Processing
```bash
# Stripe Secret Key (server-side only)
STRIPE_SECRET_KEY=sk_live_... or sk_test_...

# Stripe Publishable Key (client-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...

# Stripe Price IDs for subscriptions
NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID=price_...

# Optional: Legacy price IDs (for backward compatibility)
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID=price_...

# Stripe Webhook Secret (for webhook verification)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### PROGNO Integration
```bash
# PROGNO API Base URL (where PROGNO is deployed)
PROGNO_BASE_URL=https://progno.vercel.app
# OR for local development:
# PROGNO_BASE_URL=http://localhost:3008

# Optional: PROGNO API Key (if PROGNO requires authentication)
PROGNO_API_KEY=...
PROGNO_API_URL=http://localhost:8080
```

### SMS Alerts (Sinch)
```bash
# Sinch Service Plan ID
SINCH_SERVICE_PLAN_ID=...

# Sinch API Token
SINCH_API_TOKEN=...

# Sinch From Number (phone number to send from)
SINCH_FROM_NUMBER=+1234567890
# OR (alternative name)
SINCH_FROM=+1234567890
```

### Supabase Database
```bash
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co

# Supabase Anon Key (public, client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase Service Role Key (server-side only, full access)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Application URLs
```bash
# Base URL for the application (used for redirects, webhooks, etc.)
NEXT_PUBLIC_BASE_URL=https://prognostication.com
# OR for local development:
# NEXT_PUBLIC_BASE_URL=http://localhost:3005

# Optional: App URL (alternative name)
NEXT_PUBLIC_APP_URL=https://prognostication.com
```

### Google AdSense (Optional)
```bash
# Google AdSense Publisher ID
NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID=ca-pub-0940073536675562
```

## Environment Variable Setup

### For Local Development
Create `.env.local` in `apps/prognostication/`:
```bash
# Copy from above and fill in your values
```

### For Vercel Deployment
1. Go to Vercel Dashboard → Prognostication Project
2. Settings → Environment Variables
3. Add each variable above
4. Select environments: Production, Preview, Development
5. Redeploy after adding variables

## Verification

Check if all required variables are set:
```bash
# Visit in browser or curl:
https://prognostication.com/api/checkout/validate
```

This endpoint returns:
- Which price IDs are configured
- Which other required vars are set
- Missing variables list

## Priority Order

### Critical (App won't work without these):
1. `STRIPE_SECRET_KEY` - Required for payments
2. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Required for checkout
3. `PROGNO_BASE_URL` - Required to fetch picks
4. At least one Stripe Price ID for each tier (Pro and Elite)

### Important (Features won't work without these):
5. `NEXT_PUBLIC_BASE_URL` - Required for redirects
6. `SINCH_SERVICE_PLAN_ID`, `SINCH_API_TOKEN`, `SINCH_FROM_NUMBER` - Required for SMS alerts
7. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Required if using Supabase features
8. `SUPABASE_SERVICE_ROLE_KEY` - Required for server-side Supabase operations

### Optional:
9. `STRIPE_WEBHOOK_SECRET` - Recommended for webhook security
10. `NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID` - For AdSense monetization
11. `PROGNO_API_KEY` - Only if PROGNO requires authentication

## Notes

- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser (client-side)
- Variables without `NEXT_PUBLIC_` are server-side only (more secure)
- Never commit `.env.local` to git (it's in `.gitignore`)
- Always use Vercel's environment variables for production secrets

