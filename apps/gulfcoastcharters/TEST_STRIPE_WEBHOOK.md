# Test Stripe Webhook for Tips

## Quick Test: Verify Webhook is Working

After you complete a tip payment, the webhook should automatically update the tip status. Here's how to verify:

### Method 1: Check Database (Easiest)

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/editor
   - Navigate to **Table Editor** → `tips` table

2. **Find your tip:**
   - Look for the most recent tip (by `created_at`)
   - Or filter by `booking_id` = `65038b0c-5847-49c7-98e8-a2d7d6ed7b46`

3. **Check these fields:**
   - ✅ `status` should be `completed` (not `pending`)
   - ✅ `stripe_payment_intent_id` should have a value (starts with `pi_`)
   - ✅ `stripe_transaction_id` should have a value

**If status is still `pending`:** The webhook hasn't processed yet (see troubleshooting below)

---

### Method 2: Check Stripe Dashboard

1. **Go to:** https://dashboard.stripe.com/test/webhooks
2. **Click on your webhook endpoint** (should be something like `https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/stripe-webhook`)
3. **Check "Recent events"** tab
4. **Look for:**
   - ✅ `checkout.session.completed` events
   - ✅ Status should be "Succeeded" (green)
   - ✅ Response should be `200 OK`

**If you see failed events:**
- Click on the event to see error details
- Check if webhook secret is correct

---

### Method 3: Check Supabase Edge Function Logs

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Click on `stripe-webhook` function**
3. **Click "Logs" tab**
4. **Look for:**
   - ✅ `✅ Tip payment completed: <tip_id>`
   - ✅ `✅ Payment completed: <session_id> for tip <tip_id>`
   - ❌ Any error messages

---

## Manual Test: Trigger Test Event from Stripe

If you want to test the webhook without making a real payment:

### Option A: Use Stripe Dashboard

1. **Go to:** https://dashboard.stripe.com/test/webhooks
2. **Click on your webhook endpoint**
3. **Click "Send test webhook"** button
4. **Select event:** `checkout.session.completed`
5. **Click "Send test webhook"**

**Note:** This sends a generic test event. It won't have your tip metadata, so it won't update a specific tip. But it will verify the webhook endpoint is working.

### Option B: Use Stripe CLI (If Installed)

```powershell
# Install Stripe CLI first (if not installed)
# Download from: https://stripe.com/docs/stripe-cli

# Forward webhooks to your local function (for local testing)
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Or forward to production
stripe listen --forward-to https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/stripe-webhook

# Trigger a test event
stripe trigger checkout.session.completed
```

---

## Verify Webhook Configuration

### 1. Check Webhook Endpoint URL

**In Stripe Dashboard:**
- Go to: https://dashboard.stripe.com/test/webhooks
- Your endpoint should be: `https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/stripe-webhook`

### 2. Check Webhook Events

Your webhook should listen for:
- ✅ `checkout.session.completed` (required for tips)
- ✅ `payment_intent.succeeded` (backup)
- ✅ `payment_intent.payment_failed` (error handling)

### 3. Check Webhook Secret

**In Supabase Dashboard:**
- Go to: **Project Settings** → **Edge Functions** → **Secrets**
- Should have: `STRIPE_WEBHOOK_SECRET` = `whsec_...`

**In Stripe Dashboard:**
- Go to: **Webhooks** → Click your endpoint → **Signing secret**
- Copy the secret (starts with `whsec_`)
- Make sure it matches Supabase secret

---

## SQL Query: Check Tip Status

Run this in Supabase SQL Editor to check if your tip was updated:

```sql
-- Check recent tips and their status
SELECT 
  tip_id,
  booking_id,
  amount,
  status,
  stripe_payment_intent_id,
  stripe_transaction_id,
  created_at,
  updated_at
FROM tips
ORDER BY created_at DESC
LIMIT 10;
```

**Expected result after successful payment:**
- `status` = `completed`
- `stripe_payment_intent_id` = `pi_...` (not null)
- `updated_at` = recent timestamp

---

## Troubleshooting

### Issue: Tip status is still `pending` after payment

**Possible causes:**
1. **Webhook not receiving events**
   - Check Stripe Dashboard → Webhooks → Recent events
   - If no events, webhook might not be configured

2. **Webhook secret mismatch**
   - Verify `STRIPE_WEBHOOK_SECRET` in Supabase matches Stripe Dashboard signing secret
   - Update if needed and redeploy function

3. **Webhook function error**
   - Check Supabase Edge Function logs for errors
   - Look for "Webhook signature verification failed" or other errors

4. **Metadata missing**
   - Webhook needs `metadata.type === 'tip'` and `metadata.tip_id`
   - Check that checkout session includes this metadata

### Issue: "Webhook signature verification failed"

**Fix:**
1. Get webhook signing secret from Stripe Dashboard
2. Update Supabase secret: `STRIPE_WEBHOOK_SECRET`
3. Redeploy `stripe-webhook` function

### Issue: Webhook receives events but tip not updated

**Check:**
1. Verify `metadata.tip_id` exists in webhook event
2. Check Supabase logs for "Error updating tip" messages
3. Verify tip exists in database with that `tip_id`

---

## Quick Verification Checklist

After completing a tip payment:

- [ ] Payment shows as "Succeeded" in Stripe Dashboard
- [ ] Webhook event appears in Stripe Dashboard → Webhooks → Recent events
- [ ] Webhook event status is "Succeeded" (200 OK)
- [ ] Tip status in database is `completed` (not `pending`)
- [ ] `stripe_payment_intent_id` is populated in tips table
- [ ] Supabase Edge Function logs show "✅ Tip payment completed"

**If all checked:** Webhook is working perfectly! ✅

**If any unchecked:** See troubleshooting section above.
