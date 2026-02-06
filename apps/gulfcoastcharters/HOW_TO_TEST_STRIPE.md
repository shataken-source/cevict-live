# How to Test Stripe Tip Payment

## 🎯 Quick Test Guide

### Step 1: Start Your Dev Server

```bash
cd apps/gulfcoastcharters
npm run dev
```

### Step 2: Navigate to Test Page

Open in browser:
```
http://localhost:3000/test-tip
```

### Step 3: Test the Payment Flow

1. **Click "Open Tip Modal"**
2. **Enter tip amount** (e.g., $10.00)
   - Or click one of the percentage buttons (10%, 15%, 20%, 25%)
3. **Add optional message** (e.g., "Great trip!")
4. **Click "Submit Tip"**
5. **You'll be redirected to Stripe Checkout**

### Step 4: Complete Payment with Test Card

**Use this test card:**
- **Card Number:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/25`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Step 5: Verify Success

After payment:
- ✅ Redirects to success page
- ✅ Tip status updates to `completed` in database
- ✅ Webhook receives `checkout.session.completed` event

---

## 🔍 Verify in Stripe Dashboard

1. **Go to:** https://dashboard.stripe.com/test/payments
2. **You should see** your test payment
3. **Status:** Succeeded

---

## 🔍 Verify in Supabase

1. **Go to:** Supabase Dashboard → Table Editor → `tips`
2. **Find your tip** (filter by `customer_id` or `booking_id`)
3. **Check status:** Should be `completed`
4. **Check `stripe_payment_intent_id`:** Should have a value

---

## 🔍 Verify Webhook

1. **Go to:** https://dashboard.stripe.com/test/webhooks
2. **Click on your webhook endpoint**
3. **Check "Recent events"**
4. **Should see:** `checkout.session.completed` event

---

## 🐛 Troubleshooting

### "Payment setup failed"
- ✅ Check Supabase Edge Functions secrets are set
- ✅ Check `.env.local` has `STRIPE_SECRET_KEY`
- ✅ Verify edge functions are deployed

### "Webhook signature verification failed"
- ✅ Check `STRIPE_WEBHOOK_SECRET` in Supabase secrets
- ✅ Verify webhook endpoint URL in Stripe Dashboard

### Payment succeeds but tip status doesn't update
- ✅ Check Supabase Edge Functions logs
- ✅ Verify webhook is receiving events
- ✅ Check `tip_id` is in checkout session metadata

---

## 📝 Test Card Reference

**Success:**
- `4242 4242 4242 4242` - Always succeeds

**Decline:**
- `4000 0000 0000 0002` - Card declined

**3D Secure:**
- `4000 0025 0000 3155` - Requires authentication

---

**Ready to test!** 🚀
