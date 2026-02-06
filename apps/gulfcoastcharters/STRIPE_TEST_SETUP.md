# Stripe Test Keys Setup Guide

## 🎯 Quick Start: Get Your Test Keys

### Step 1: Get Stripe Test Keys

1. **Go to Stripe Dashboard:** https://dashboard.stripe.com/test/apikeys
2. **Copy your keys:**
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

### Step 2: Set Up Supabase Edge Functions Secrets

**In Supabase Dashboard:**
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add these secrets:

```
STRIPE_SECRET_KEY=sk_test_51... (your test secret key)
STRIPE_WEBHOOK_SECRET=whsec_... (see Step 3)
SITE_URL=http://localhost:3000 (or your local URL)
```

**Or via Supabase CLI:**
```bash
cd apps/gulfcoastcharters
supabase secrets set STRIPE_SECRET_KEY=sk_test_51...
supabase secrets set SITE_URL=http://localhost:3000
```

### Step 3: Set Up Test Webhook (Local Testing)

**Option A: Use Stripe CLI (Recommended for Local Testing)**

1. **Install Stripe CLI:** https://stripe.com/docs/stripe-cli
2. **Login:**
   ```bash
   stripe login
   ```
3. **Forward webhooks to local:**
   ```bash
   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
   ```
4. **Copy the webhook signing secret** (starts with `whsec_...`)
5. **Add to Supabase secrets:**
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

**Option B: Create Test Webhook in Stripe Dashboard**

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://[your-project].supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add to Supabase secrets

### Step 4: Set Up Next.js Environment Variables

**Create/Update `.env.local`:**
```bash
# Stripe Test Keys
STRIPE_SECRET_KEY=sk_test_51... (same as Supabase secret)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51... (if needed for frontend)

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Step 5: Deploy Edge Functions

```bash
cd apps/gulfcoastcharters
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
```

---

## 🧪 Testing with Test Cards

### **Success Card:**
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

### **Decline Card:**
```
Card Number: 4000 0000 0000 0002
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

### **3D Secure Card:**
```
Card Number: 4000 0025 0000 3155
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

---

## ✅ Verification Checklist

- [ ] Stripe test keys obtained (`sk_test_...`, `pk_test_...`)
- [ ] `STRIPE_SECRET_KEY` set in Supabase Edge Functions secrets
- [ ] `STRIPE_WEBHOOK_SECRET` set in Supabase Edge Functions secrets
- [ ] `SITE_URL` set in Supabase Edge Functions secrets
- [ ] `STRIPE_SECRET_KEY` set in `.env.local` (for Next.js API routes)
- [ ] Edge functions deployed (`stripe-checkout`, `stripe-webhook`)
- [ ] Webhook endpoint configured in Stripe Dashboard (or Stripe CLI running)
- [ ] Test payment attempted with `4242 4242 4242 4242`
- [ ] Webhook events received and processed

---

## 🔍 Troubleshooting

### "STRIPE_SECRET_KEY not configured"
- ✅ Check Supabase Edge Functions secrets
- ✅ Redeploy functions after adding secrets
- ✅ Check `.env.local` for Next.js API routes

### "Webhook signature verification failed"
- ✅ Verify `STRIPE_WEBHOOK_SECRET` matches Stripe webhook signing secret
- ✅ Check webhook endpoint URL is correct
- ✅ Ensure webhook is receiving events in Stripe Dashboard

### "Payment failed" but no error
- ✅ Check Stripe Dashboard → Payments for error details
- ✅ Use test card `4242 4242 4242 4242` (not a real card)
- ✅ Verify webhook is processing events correctly

### Tip status not updating
- ✅ Check webhook is receiving `checkout.session.completed` event
- ✅ Verify `tip_id` is in checkout session metadata
- ✅ Check Supabase logs for webhook errors
- ✅ Ensure webhook handler has tip payment logic

---

## 🚀 When Ready for Production

1. **Switch to Live Keys:**
   - Get live keys from: https://dashboard.stripe.com/apikeys
   - Update `STRIPE_SECRET_KEY` to `sk_live_...`
   - Update webhook endpoint to production URL
   - Update `SITE_URL` to production domain

2. **Update Webhook:**
   - Create production webhook endpoint in Stripe Dashboard
   - Update `STRIPE_WEBHOOK_SECRET` with production signing secret

3. **Test in Production:**
   - Use real cards (small amounts)
   - Verify webhook events are received
   - Check database updates

---

## 📝 Quick Reference

**Test Keys:**
- Secret: `sk_test_...`
- Publishable: `pk_test_...`
- Webhook Secret: `whsec_...` (from Stripe Dashboard or CLI)

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

**Stripe Dashboard:**
- Test Mode: https://dashboard.stripe.com/test
- API Keys: https://dashboard.stripe.com/test/apikeys
- Webhooks: https://dashboard.stripe.com/test/webhooks
- Payments: https://dashboard.stripe.com/test/payments

---

**You're all set! Start with test keys, test thoroughly, then switch to production when ready.** 🎉
