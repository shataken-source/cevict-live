# Verify Webhook is Now Working

## Step 1: Test Webhook from Stripe Dashboard

1. **Go to:** https://dashboard.stripe.com/test/webhooks
2. **Click on your webhook endpoint** ("gulfcoastcharters")
3. **Click "Send test webhook"** button
4. **Select event:** `checkout.session.completed`
5. **Click "Send test webhook"**

**Expected Result:**
- ✅ Status: "Succeeded" (green checkmark)
- ✅ Response: `200 OK`
- ✅ Error rate should start dropping

---

## Step 2: Check Supabase Logs

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Click on `stripe-webhook` function**
3. **Click "Logs" tab**
4. **Look for recent logs:**
   - ✅ Should see webhook processing (no 401 errors)
   - ✅ May see "Unhandled event type" (that's OK for test events without tip metadata)

---

## Step 3: Make a Real Test Payment

1. **Go to:** http://localhost:3001/test-tip (or your dev URL)
2. **Load a booking** (use booking ID: `65038b0c-5847-49c7-98e8-a2d7d6ed7b46`)
3. **Click "Open Tip Modal"**
4. **Enter tip amount** (e.g., $10.00)
5. **Click "Submit Tip"**
6. **Complete payment** with test card: `4242 4242 4242 4242`

**After payment completes:**

7. **Check database:**
   ```sql
   SELECT 
     tip_id,
     amount,
     status,
     stripe_payment_intent_id,
     updated_at
   FROM tips
   ORDER BY created_at DESC
   LIMIT 1;
   ```

**Expected:**
- ✅ `status` = `completed` (not `pending`)
- ✅ `stripe_payment_intent_id` = `pi_...` (not null)
- ✅ `updated_at` = recent timestamp

---

## Step 4: Check Stripe Dashboard Events

1. **Go to:** https://dashboard.stripe.com/test/webhooks
2. **Click on your webhook endpoint**
3. **Click "Recent events" tab**
4. **Look for the new `checkout.session.completed` event**
5. **Click on it** to see details

**Expected:**
- ✅ Status: "Succeeded"
- ✅ Response: `200 OK`
- ✅ Response body should show: `{"received":true}`

---

## Success Indicators

If everything is working:

- ✅ Test webhook succeeds (200 OK)
- ✅ Error rate drops from 100% to 0%
- ✅ New tip payment updates to `completed` in database
- ✅ `stripe_payment_intent_id` is populated
- ✅ Webhook events show "Succeeded" in Stripe Dashboard

---

## If Still Not Working

### Check 1: Verify JWT is OFF
- Go back to function Details tab
- Confirm "Verify JWT with legacy secret" is OFF (gray)

### Check 2: Check Webhook Secret
- Go to: Supabase Dashboard → Settings → Edge Functions → Secrets
- Verify `STRIPE_WEBHOOK_SECRET` exists and matches Stripe's signing secret

### Check 3: Check Function Logs
- Look for specific error messages
- Common errors:
  - "Webhook signature verification failed" → Secret mismatch
  - "Error updating tip" → Database issue
  - "Missing stripe-signature header" → Stripe not sending properly

---

## Next Steps

Once webhook is working:

1. ✅ **Old tips won't auto-update** - they were created before webhook was fixed
2. ✅ **New tips will auto-update** - they'll process automatically
3. ✅ **You can manually update old tips** if needed (see SQL below)

### Manually Update Old Tips (Optional)

If you want to mark old tips as completed (for testing):

```sql
-- Update all pending tips to completed (for testing only)
-- WARNING: Only do this if you've verified payments actually succeeded in Stripe
UPDATE tips
SET 
  status = 'completed',
  updated_at = NOW()
WHERE status = 'pending'
  AND created_at > '2026-01-25'; -- Adjust date as needed
```

**Note:** This is just for testing. In production, only update tips that actually have successful payments in Stripe.
