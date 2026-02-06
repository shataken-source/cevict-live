# Stripe Setup Verification Checklist

## ✅ Completed Steps

- [x] Stripe test keys obtained
  - Secret: `sk_test_51STl4a18sNHY3ux6XnFq6q6VJO5qmViVRPmsnE7pNbZCTJW6yDurvehjWPrg7tAChVWvnYaNP8VHcD7rJhN68BHt00tjApjqBq`
  - Publishable: `pk_test_51STl4a18sNHY3ux6bXxWbRti6senllwMD7cotvuw1jYSdq7R8SUf4TstSWnlUIc5hMkGTkCFGQ1EpiPDEL2A51Wb007ve9cFL2`
  - Webhook: `whsec_YEUiXmEPmQGcKlii0OjHBy2bB3UNztvp`

- [x] Keys added to vault (`C:\Cevict_Vault\env-store.json`)
- [x] Stripe CLI configured
- [x] Webhook endpoint created in Stripe Dashboard

## 🔍 Verification Steps

### 1. Check Supabase Edge Functions Secrets

**Go to:** https://supabase.com/dashboard → Your Project → Settings → Edge Functions → Secrets

**Verify these secrets exist:**
- `STRIPE_SECRET_KEY` = `sk_test_51STl4a18sNHY3ux6XnFq6q6VJO5qmViVRPmsnE7pNbZCTJW6yDurvehjWPrg7tAChVWvnYaNP8VHcD7rJhN68BHt00tjApjqBq`
- `STRIPE_WEBHOOK_SECRET` = `whsec_YEUiXmEPmQGcKlii0OjHBy2bB3UNztvp`
- `SITE_URL` = `http://localhost:3000` (or your production URL)

### 2. Check `.env.local` File

**File:** `apps/gulfcoastcharters/.env.local`

**Should contain:**
```env
STRIPE_SECRET_KEY=sk_test_51STl4a18sNHY3ux6XnFq6q6VJO5qmViVRPmsnE7pNbZCTJW6yDurvehjWPrg7tAChVWvnYaNP8VHcD7rJhN68BHt00tjApjqBq
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51STl4a18sNHY3ux6bXxWbRti6senllwMD7cotvuw1jYSdq7R8SUf4TstSWnlUIc5hMkGTkCFGQ1EpiPDEL2A51Wb007ve9cFL2
```

### 3. Verify Edge Functions Are Deployed

**Go to:** https://supabase.com/dashboard → Your Project → Edge Functions

**Should see:**
- `stripe-checkout` function deployed
- `stripe-webhook` function deployed

If not deployed, deploy them via Dashboard or CLI.

### 4. Verify Webhook Endpoint in Stripe

**Go to:** https://dashboard.stripe.com/test/webhooks

**Should see:**
- Endpoint URL: `https://[your-project].supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
- Status: Enabled

---

## 🧪 Test the Integration

### Test 1: Create a Tip (API Test)

```bash
# Test the tip creation endpoint
curl -X POST http://localhost:3000/api/tips/create \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-auth-cookie]" \
  -d '{
    "bookingId": "test-booking-id",
    "amount": 10.00,
    "customerMessage": "Test tip"
  }'
```

### Test 2: Complete Payment Flow

1. **Open your app** in browser
2. **Navigate to a completed booking**
3. **Click "Add Tip"**
4. **Enter tip amount** (e.g., $10)
5. **Submit** - should redirect to Stripe Checkout
6. **Use test card:** `4242 4242 4242 4242`
7. **Complete payment**
8. **Verify:**
   - Redirects back to success page
   - Tip status updates to `completed` in database
   - Webhook receives `checkout.session.completed` event

### Test 3: Check Webhook Logs

**In Stripe Dashboard:**
- Go to: https://dashboard.stripe.com/test/webhooks
- Click on your webhook endpoint
- Check "Recent events" - should see `checkout.session.completed` events

**In Supabase Dashboard:**
- Go to: Edge Functions → `stripe-webhook` → Logs
- Should see successful webhook processing logs

---

## 🐛 Troubleshooting

### "STRIPE_SECRET_KEY not configured"
- ✅ Check Supabase Edge Functions secrets
- ✅ Check `.env.local` file
- ✅ Restart Next.js dev server after adding to `.env.local`

### "Webhook signature verification failed"
- ✅ Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard webhook signing secret
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

## ✅ Final Checklist

- [ ] Supabase Edge Functions secrets configured
- [ ] `.env.local` has Stripe keys
- [ ] Edge functions deployed (`stripe-checkout`, `stripe-webhook`)
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Test payment attempted with `4242 4242 4242 4242`
- [ ] Webhook events received and processed
- [ ] Tip status updates to `completed` after payment

---

**Once all items are checked, your Stripe integration is ready!** 🎉
