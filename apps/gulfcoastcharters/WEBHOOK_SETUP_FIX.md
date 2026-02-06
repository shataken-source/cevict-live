# Fix Webhook: Tips Not Updating to "Completed"

## Problem
All tips are stuck in `pending` status because the webhook isn't processing payments.

## Step-by-Step Fix

### Step 1: Check if Webhook Exists in Stripe

1. **Go to:** https://dashboard.stripe.com/test/webhooks
2. **Look for a webhook endpoint** with URL: `https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/stripe-webhook`

**If it doesn't exist:** Go to Step 2  
**If it exists:** Go to Step 3

---

### Step 2: Create Webhook Endpoint (If Missing)

1. **In Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Click **"Add endpoint"** or **"Create webhook"**

2. **Set Endpoint URL:**
   ```
   https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/stripe-webhook
   ```

3. **Select Events to Listen For:**
   - ✅ `checkout.session.completed` (REQUIRED for tips)
   - ✅ `payment_intent.succeeded` (backup)
   - ✅ `payment_intent.payment_failed` (error handling)

4. **Click "Add endpoint"**

5. **Copy the Signing Secret:**
   - After creating, click on the webhook endpoint
   - Click **"Reveal"** next to "Signing secret"
   - Copy the secret (starts with `whsec_...`)
   - **You'll need this in Step 3!**

---

### Step 3: Set Webhook Secret in Supabase

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/functions

2. **Click "Secrets" tab**

3. **Add or Update Secret:**
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** The `whsec_...` secret you copied from Stripe (Step 2)
   - Click **"Add secret"** or **"Update"**

4. **Verify these secrets also exist:**
   - ✅ `STRIPE_SECRET_KEY` = `sk_test_...` (your Stripe test key)
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` = `eyJ...` (your service role key)
   - ✅ `SUPABASE_URL` = `https://rdbuwyefbgnbuhmjrizo.supabase.co` (usually auto-set)

---

### Step 4: Verify Webhook Function is Deployed

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Check if `stripe-webhook` function exists**
3. **If it doesn't exist:**
   - Click **"Create a new function"**
   - Name: `stripe-webhook`
   - Copy code from: `apps/gulfcoastcharters/supabase/functions/stripe-webhook/index.ts`
   - Paste into editor
   - Click **"Deploy"**
   - **Turn OFF "Verify JWT"** toggle (if visible)

---

### Step 5: Test the Webhook

#### Option A: Send Test Event from Stripe (Easiest)

1. **Go to:** https://dashboard.stripe.com/test/webhooks
2. **Click on your webhook endpoint**
3. **Click "Send test webhook"** button
4. **Select event:** `checkout.session.completed`
5. **Click "Send test webhook"**

**Expected Result:**
- Status should be "Succeeded" (green checkmark)
- Response should be `200 OK`

**If it fails:**
- Check Supabase Edge Function logs for errors
- Verify `STRIPE_WEBHOOK_SECRET` is correct

#### Option B: Check Recent Events

1. **Go to:** https://dashboard.stripe.com/test/webhooks
2. **Click on your webhook endpoint**
3. **Click "Recent events" tab**
4. **Look for recent `checkout.session.completed` events**

**If you see events:**
- ✅ Webhook is receiving events
- Check if status is "Succeeded" or "Failed"
- If "Failed", click on event to see error

**If you see NO events:**
- ❌ Webhook wasn't triggered
- This means Stripe isn't sending events (webhook might not be configured correctly)

---

### Step 6: Manually Update a Tip (Quick Test)

To verify the webhook function works, manually update one tip:

```sql
-- Run this in Supabase SQL Editor
-- Replace <tip_id> with one of your tip IDs
UPDATE tips
SET 
  status = 'completed',
  stripe_payment_intent_id = 'pi_test_manual',
  updated_at = NOW()
WHERE tip_id = '4f312418-1842-4185-a936-18b220fe4a35';
```

**This is just to verify the database update works.** The real fix is getting the webhook to process automatically.

---

### Step 7: Check Webhook Logs

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Click on `stripe-webhook` function**
3. **Click "Logs" tab**
4. **Look for:**
   - ✅ `✅ Tip payment completed: <tip_id>` (success)
   - ❌ `Error updating tip:` (failure)
   - ❌ `Webhook signature verification failed` (secret mismatch)

---

## Quick Checklist

After completing all steps:

- [ ] Webhook endpoint exists in Stripe Dashboard
- [ ] Webhook URL is: `https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/stripe-webhook`
- [ ] Webhook listens for `checkout.session.completed` event
- [ ] `STRIPE_WEBHOOK_SECRET` is set in Supabase secrets
- [ ] `stripe-webhook` function is deployed in Supabase
- [ ] Test webhook event succeeds (200 OK)
- [ ] Recent events appear in Stripe Dashboard

---

## Common Issues

### Issue: "Webhook signature verification failed"

**Fix:**
1. Get signing secret from Stripe Dashboard → Webhooks → Your endpoint → Signing secret
2. Update `STRIPE_WEBHOOK_SECRET` in Supabase secrets
3. Redeploy `stripe-webhook` function (or wait a few minutes for secret to propagate)

### Issue: No events in Stripe Dashboard

**Possible causes:**
1. Webhook endpoint URL is incorrect
2. Webhook was created but events aren't being sent
3. Payments were made before webhook was created

**Fix:**
1. Verify webhook URL is exactly: `https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/stripe-webhook`
2. Make a new test payment after webhook is configured
3. Check if webhook is in "Test mode" (should match your Stripe test mode)

### Issue: Events received but tips not updated

**Check:**
1. Verify `metadata.tip_id` exists in webhook event payload
2. Check Supabase logs for "Error updating tip" messages
3. Verify tip exists in database with that `tip_id`

---

## Next Steps After Fix

Once webhook is working:

1. **Make a new test payment** (the old ones won't trigger webhooks retroactively)
2. **Check tip status** in database - should be `completed`
3. **Verify** `stripe_payment_intent_id` is populated

---

## Need Help?

If webhook still doesn't work after following all steps:

1. **Check Supabase Edge Function logs** for specific errors
2. **Check Stripe Dashboard → Webhooks → Recent events** for failed events
3. **Verify** all secrets are set correctly in Supabase
