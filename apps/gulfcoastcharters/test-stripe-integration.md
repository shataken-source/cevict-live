# Stripe Payment Integration - Test Plan

**Feature:** Stripe Checkout + Webhook Integration  
**Status:** ✅ Code Complete - Ready for Testing

---

## ✅ Implementation Complete

### Edge Functions Created
1. ✅ `supabase/functions/stripe-checkout/index.ts` - Creates checkout sessions
2. ✅ `supabase/functions/stripe-webhook/index.ts` - Handles webhook events
3. ✅ `supabase/functions/process-payment/index.ts` - Legacy direct payment

### Database Migration
1. ✅ `supabase/migrations/20260119_stripe_payment_columns.sql` - Adds required columns

---

## 🧪 Test Plan

### Test 1: Database Schema
**Action:** Run migration
```sql
-- Run in Supabase SQL Editor:
-- supabase/migrations/20260119_stripe_payment_columns.sql
```

**Expected:**
- ✅ `bookings.stripe_checkout_session_id` column exists
- ✅ `bookings.payment_status` column exists
- ✅ `payments.stripe_checkout_session_id` column exists
- ✅ Indexes created

**Verify:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
  AND column_name LIKE '%stripe%';
```

---

### Test 2: Stripe Checkout Function (Manual)

**Prerequisites:**
- Stripe test API key configured in Supabase secrets
- Supabase Edge Function deployed

**Test Request:**
```javascript
// In browser console or Postman
const response = await fetch('https://[project].supabase.co/functions/v1/stripe-checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer [anon-key]'
  },
  body: JSON.stringify({
    type: 'booking',
    amount: 100.00,
    customerEmail: 'test@example.com',
    customerName: 'Test Customer',
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    metadata: {
      bookingId: 'test-123',
      captainId: 'test-captain-456'
    }
  })
});

const data = await response.json();
console.log(data);
```

**Expected:**
- ✅ Status: 200
- ✅ Response contains `url` (Stripe checkout URL)
- ✅ Response contains `sessionId`
- ✅ Booking record updated with `stripe_checkout_session_id` (if bookingId provided)

**Verify in Supabase:**
```sql
SELECT id, stripe_checkout_session_id, payment_status 
FROM bookings 
WHERE id = 'test-123';
```

---

### Test 3: Frontend Integration

**Test Component:** `SecurePaymentProcessor`

**Steps:**
1. Open booking modal
2. Fill in booking details
3. Click "Pay Securely"
4. Should redirect to Stripe checkout

**Expected:**
- ✅ No console errors
- ✅ Redirects to Stripe checkout page
- ✅ Booking created in database
- ✅ `stripe_checkout_session_id` saved

---

### Test 4: Stripe Webhook (Test Mode)

**Prerequisites:**
- Stripe CLI installed: `stripe --version`
- Webhook endpoint deployed

**Setup:**
```bash
# Forward webhooks to local function
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Or for deployed:
stripe listen --forward-to https://[project].supabase.co/functions/v1/stripe-webhook
```

**Test Events:**
```bash
# Trigger test checkout.session.completed
stripe trigger checkout.session.completed
```

**Expected:**
- ✅ Webhook receives event
- ✅ Payment record created in `payments` table
- ✅ Booking `payment_status` updated to 'paid'
- ✅ Booking `status` updated to 'confirmed'

**Verify:**
```sql
SELECT * FROM payments ORDER BY created_at DESC LIMIT 1;
SELECT id, payment_status, status FROM bookings WHERE id = '[booking-id]';
```

---

### Test 5: End-to-End Payment Flow

**Steps:**
1. Create booking via frontend
2. Complete Stripe checkout (use test card: `4242 4242 4242 4242`)
3. Verify webhook processes payment
4. Check database updates

**Expected:**
- ✅ Booking created
- ✅ Stripe checkout session created
- ✅ Payment completed
- ✅ Webhook processes event
- ✅ Database updated correctly
- ✅ User redirected to success page

---

## 🐛 Common Issues & Fixes

### Issue: "STRIPE_SECRET_KEY not configured"
**Fix:** Add secret to Supabase Edge Functions secrets

### Issue: "Webhook signature verification failed"
**Fix:** 
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe webhook signing secret
- Verify webhook endpoint URL in Stripe Dashboard

### Issue: "Column stripe_checkout_session_id does not exist"
**Fix:** Run migration: `20260119_stripe_payment_columns.sql`

### Issue: Booking not updating after payment
**Fix:**
- Check webhook is receiving events
- Verify `bookingId` in checkout session metadata
- Check Supabase function logs

---

## ✅ Test Checklist

- [ ] Database migration run successfully
- [ ] Stripe API keys configured in Supabase
- [ ] Edge Functions deployed
- [ ] Webhook endpoint configured in Stripe
- [ ] Test checkout session creation works
- [ ] Test webhook processing works
- [ ] Frontend integration works
- [ ] End-to-end payment flow works
- [ ] Database updates correctly

---

## 📊 Success Criteria

✅ **Feature is working when:**
1. Checkout sessions can be created
2. Users can complete payments via Stripe
3. Webhooks update database correctly
4. Bookings show correct payment status
5. No errors in console/logs

---

**Ready to test!** 🧪
