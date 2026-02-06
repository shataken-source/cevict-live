# Test Payment Instructions for Zapier Automation

## ✅ Checkout Session Created

I've created a Stripe checkout session for testing. Here's how to complete the test payment:

## Option 1: Complete Payment via Checkout URL (Recommended)

**Checkout URL:**
```
https://checkout.stripe.com/c/pay/cs_test_a1vOCY6zjSR3mviMAa3cGQUKpHfIUlazSx6LRgCjoglXy9JFwKK1zkR6id
```

**Steps:**
1. Open the checkout URL above in your browser
2. Use the test card: **4242 4242 4242 4242**
3. Use any future expiry date (e.g., 12/25)
4. Use any CVC (e.g., 123)
5. Complete the payment
6. This will trigger your Zapier webhook!

**Test Booking Details:**
- Booking ID: `test-booking-[timestamp]`
- Customer: Test Customer
- Email: test@example.com
- Phone: +12025551234
- Charter: Test Charter
- Amount: $100.00

---

## Option 2: Use Stripe CLI (If Installed)

If you have Stripe CLI installed, you can trigger the webhook directly:

```bash
stripe trigger checkout.session.completed
```

Or create a test payment:

```bash
stripe payment_intents create \
  --amount=10000 \
  --currency=usd \
  --metadata[bookingId]=test-booking-123 \
  --metadata[customerName]="Test Customer" \
  --metadata[customerPhone]="+12025551234" \
  --metadata[charterName]="Test Charter" \
  --metadata[bookingDate]="2026-01-25" \
  --metadata[bookingTime]="09:00"
```

---

## Option 3: Create New Test Payment

Run this PowerShell script to create a fresh checkout session:

```powershell
cd c:\cevict-live
powershell -ExecutionPolicy Bypass -File test_stripe_booking_simple.ps1
```

Then visit the checkout URL it provides.

---

## What Happens After Payment

Once you complete the payment:

1. ✅ **Stripe** sends `checkout.session.completed` webhook to Zapier
2. ✅ **Zapier** triggers your Zap:
   - Sends email via Resend
   - Sends SMS via Sinch
   - Updates Supabase booking status to "confirmed"
3. ✅ **Check Zapier Dashboard** to see if the Zap ran successfully

---

## Verify in Supabase

After payment, check your Supabase database:

```sql
SELECT id, status, payment_status, stripe_checkout_session_id, updated_at
FROM bookings
WHERE id = 'test-booking-[timestamp]'
ORDER BY created_at DESC
LIMIT 1;
```

The booking should show:
- `status` = `'confirmed'`
- `payment_status` = `'paid'`
- `stripe_checkout_session_id` = the session ID

---

## Troubleshooting

**If Zapier doesn't trigger:**
1. Check Zapier dashboard → Your Zap → History
2. Verify Stripe webhook is connected in Zapier
3. Check Stripe Dashboard → Developers → Webhooks for delivery logs

**If payment doesn't complete:**
- Make sure you're using test mode (keys start with `sk_test_`)
- Use test card: 4242 4242 4242 4242
- Check Stripe Dashboard → Payments for the payment attempt

---

**Ready to test?** Visit the checkout URL above and complete the payment! 🎣
