# Stripe Payment Integration Setup

**Status:** ✅ Edge Functions Created  
**Priority:** CRITICAL - Required for revenue generation

---

## ✅ What's Been Implemented

### Edge Functions Created

1. **`supabase/functions/stripe-checkout/index.ts`**
   - Creates Stripe Checkout Sessions
   - Supports: bookings, custom emails, marketplace, gift cards
   - PCI-DSS compliant (no card data on our servers)
   - Returns checkout URL for redirect

2. **`supabase/functions/stripe-webhook/index.ts`**
   - Handles Stripe webhook events
   - Updates bookings and payments tables
   - Processes: payment success, failure, refunds

3. **`supabase/functions/process-payment/index.ts`**
   - Alternative direct payment processing (legacy)
   - ⚠️ **Not recommended** - use stripe-checkout instead

---

## 🔧 Setup Instructions

### Step 1: Get Stripe API Keys

1. **Create Stripe account:** https://stripe.com
2. **Get API keys:**
   - Go to Developers → API keys
   - Copy **Publishable key** (starts with `pk_`)
   - Copy **Secret key** (starts with `sk_`)

### Step 2: Configure Supabase Environment Variables

**In Supabase Dashboard:**
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add these secrets:

```
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
STRIPE_WEBHOOK_SECRET=whsec_... (from webhook endpoint)
SITE_URL=https://gulfcoastcharters.com (your domain)
```

**Or via Supabase CLI:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SITE_URL=https://gulfcoastcharters.com
```

### Step 3: Deploy Edge Functions

```bash
cd apps/gulfcoastcharters
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy process-payment
```

**Or via Supabase Dashboard:**
1. Go to **Edge Functions**
2. Click **Deploy** for each function
3. Upload the `index.ts` files

### Step 4: Set Up Stripe Webhook

1. **In Stripe Dashboard:**
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - Endpoint URL: `https://[your-project].supabase.co/functions/v1/stripe-webhook`
   - Select events:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
   - Copy **Signing secret** (starts with `whsec_`)
   - Add to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

### Step 5: Configure Frontend (Optional)

If you need Stripe Publishable Key in frontend:

**Add to `.env.local`:**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
```

**Note:** Frontend components already use Supabase Edge Functions, so this may not be needed.

---

## 🧪 Testing

### Test Mode

1. **Use Stripe test keys:**
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`

2. **Test cards:**
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`
   - Any future expiry, any CVC

3. **Test webhook locally:**
   ```bash
   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
   ```

### Production

1. **Switch to live keys:**
   - `STRIPE_SECRET_KEY=sk_live_...`
   - Update webhook endpoint to production URL

2. **Verify webhook:**
   - Check Stripe Dashboard → Webhooks → Recent events
   - Verify events are being received

---

## 📋 Integration Points

### Frontend Components Using Stripe

1. **`SecurePaymentProcessor.tsx`**
   - Calls: `supabase.functions.invoke('stripe-checkout')`
   - For: Booking payments

2. **`StripeCheckoutFlow.tsx`**
   - Calls: `supabase.functions.invoke('stripe-checkout')`
   - For: Booking checkout flow

3. **`StripeEmailCheckout.tsx`**
   - Calls: `supabase.functions.invoke('stripe-checkout')`
   - For: Custom email purchases

4. **`PaymentProcessor.tsx`**
   - Calls: `supabase.functions.invoke('process-payment')`
   - ⚠️ Legacy - consider migrating to stripe-checkout

5. **`BookingModal.tsx`**
   - Calls: `supabase.functions.invoke('stripe-checkout')`
   - For: Charter bookings

---

## 🔒 Security

### PCI-DSS Compliance

✅ **Using Stripe Checkout (Recommended):**
- Card data never touches our servers
- Stripe handles all PCI compliance
- Redirect to Stripe-hosted checkout page

⚠️ **Using process-payment (Not Recommended):**
- Requires PCI-DSS compliance
- Card data passes through our servers
- More security risk

**Recommendation:** Use `stripe-checkout` for all new payments.

---

## 🐛 Troubleshooting

### "STRIPE_SECRET_KEY not configured"
- Add secret to Supabase Edge Functions secrets
- Redeploy function after adding secret

### "Webhook signature verification failed"
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe webhook signing secret
- Verify webhook endpoint URL is correct
- Check webhook is receiving events in Stripe Dashboard

### "Payment failed" but no error
- Check Stripe Dashboard → Payments for error details
- Verify card is valid (use test cards in test mode)
- Check webhook is processing events correctly

### Booking not updating after payment
- Check webhook is receiving `checkout.session.completed` event
- Verify `bookingId` is in checkout session metadata
- Check Supabase logs for webhook errors

---

## 📊 Database Tables

The payment system uses these tables:

- **`payments`** - Payment records
  - `stripe_payment_intent_id`
  - `stripe_charge_id`
  - `status` (pending, completed, failed, refunded)
  - `booking_id` (links to booking)

- **`bookings`** - Booking records
  - `payment_status` (pending, paid, failed, refunded)
  - `stripe_checkout_session_id`
  - `status` (pending, confirmed, cancelled)

- **`subscriptions`** - Subscription records (for future)
  - `stripe_customer_id`
  - `stripe_subscription_id`

---

## ✅ Next Steps

1. ✅ Edge Functions created
2. ⏳ Deploy to Supabase
3. ⏳ Configure Stripe keys
4. ⏳ Set up webhook endpoint
5. ⏳ Test payment flow
6. ⏳ Verify database updates

---

## 🚀 Deployment Checklist

- [ ] Stripe account created
- [ ] API keys obtained (test + live)
- [ ] Edge Functions deployed to Supabase
- [ ] Environment variables set in Supabase
- [ ] Webhook endpoint configured in Stripe
- [ ] Webhook secret added to Supabase
- [ ] Test payment successful
- [ ] Webhook events processing correctly
- [ ] Database updates verified
- [ ] Production keys configured (when ready)

---

**Payment system is ready to deploy!** 💳
