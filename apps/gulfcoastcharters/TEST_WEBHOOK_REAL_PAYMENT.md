# Test Webhook with Real Payment

Since the Stripe Dashboard test button isn't working, let's test with a real payment.

## Step 1: Make a Test Tip Payment

1. **Go to:** http://localhost:3001/test-tip
2. **Enter booking ID:** `65038b0c-5847-49c7-98e8-a2d7d6ed7b46`
3. **Click "Load Booking"**
4. **Click "Open Tip Modal"**
5. **Enter tip amount:** $10.00 (or any amount)
6. **Click "Submit Tip"**
7. **Complete payment with test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

## Step 2: Check Database Immediately

After payment completes, run this SQL in Supabase:

```sql
SELECT 
  tip_id,
  booking_id,
  amount,
  status,
  stripe_payment_intent_id,
  created_at,
  updated_at
FROM tips
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result:**
- ✅ `status` = `completed` (not `pending`)
- ✅ `stripe_payment_intent_id` = `pi_...` (not null)
- ✅ `updated_at` = recent timestamp (within last minute)

**If status is still `pending`:**
- Wait 10-30 seconds (webhook might be processing)
- Check Supabase logs (see Step 3)

## Step 3: Check Supabase Logs

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Click on `stripe-webhook` function**
3. **Click "Logs" tab**
4. **Look for recent entries** (should be within last minute)

**Success indicators:**
- ✅ `✅ Tip payment completed: <tip_id>`
- ✅ `✅ Payment completed: <session_id> for tip <tip_id>`
- ✅ No `401 Unauthorized` errors
- ✅ No `Webhook signature verification failed` errors

**If you see errors:**
- `401 Unauthorized` → JWT verification might still be ON (double-check function settings)
- `Webhook signature verification failed` → `STRIPE_WEBHOOK_SECRET` mismatch
- `Error updating tip` → Database issue (check tip_id exists)

## Step 4: Check Stripe Dashboard Events

1. **Go to:** https://dashboard.stripe.com/test/webhooks
2. **Click on your webhook endpoint** ("gulfcoastcharters")
3. **Click "Event deliveries" tab** (or "Recent events")
4. **Look for the most recent event:**
   - Should be `checkout.session.completed`
   - Status should be "Succeeded" (green) if webhook worked
   - Status will be "Failed" (red) if webhook failed

**Click on the event** to see:
- Response code (should be `200` if successful)
- Response body (should be `{"received":true}`)
- Error message (if failed)

## Troubleshooting

### If Tip Status is Still `pending`

1. **Check Supabase logs** for specific error messages
2. **Verify JWT is OFF:**
   - Go to function Details tab
   - Confirm "Verify JWT with legacy secret" is OFF (gray)
3. **Check webhook secret:**
   - Go to Supabase → Settings → Edge Functions → Secrets
   - Verify `STRIPE_WEBHOOK_SECRET` matches Stripe's signing secret
4. **Check function is deployed:**
   - Verify `stripe-webhook` function exists and is active

### If Webhook Event Shows "Failed"

1. **Click on the failed event** in Stripe Dashboard
2. **Check the error message:**
   - `401 Unauthorized` → JWT verification issue
   - `400 Bad Request` → Function code error (check Supabase logs)
   - `500 Internal Server Error` → Function runtime error (check Supabase logs)

---

## Alternative: Check Old Events

The 3 failed events you saw earlier were from before JWT was turned OFF. Those won't retry automatically, but new events should work.

To verify:
1. Make a NEW test payment (don't rely on old ones)
2. Check if the NEW event succeeds
3. If new event succeeds → webhook is fixed! ✅
4. If new event fails → check logs for specific error

---

## Success Checklist

After making a test payment:

- [ ] Payment completes successfully in Stripe
- [ ] New `checkout.session.completed` event appears in Stripe Dashboard
- [ ] Event status is "Succeeded" (not "Failed")
- [ ] Tip status in database is `completed` (not `pending`)
- [ ] `stripe_payment_intent_id` is populated
- [ ] Supabase logs show "✅ Tip payment completed"

**If all checked:** Webhook is working! 🎉
