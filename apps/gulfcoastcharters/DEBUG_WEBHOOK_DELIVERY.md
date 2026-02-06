# Debug: Webhook Not Receiving Events

## Problem
- ✅ Payment completed in Stripe (`checkout.session.completed` event exists)
- ✅ Tip created in database
- ❌ Tip status still `pending` (webhook didn't update it)
- ❌ No webhook logs in Supabase (function never received the event)

## Root Cause
**Stripe is not successfully delivering the webhook event to your endpoint.**

## Step 1: Check Event Deliveries in Stripe

1. **Go to:** https://dashboard.stripe.com/test/webhooks
2. **Click on your webhook endpoint** ("gulfcoastcharters")
3. **Click "Event deliveries" tab** (or "Recent events")
4. **Look for the `checkout.session.completed` event from 7:09 PM**

**What to look for:**
- ✅ **"Succeeded"** (green) = Webhook received and processed
- ❌ **"Failed"** (red) = Webhook delivery failed
- ⏳ **"Pending"** = Still trying to deliver

**If you see "Failed":**
- Click on the failed event
- Check the error message:
  - `401 Unauthorized` → JWT verification still ON or secret issue
  - `400 Bad Request` → Function code error
  - `500 Internal Server Error` → Function runtime error
  - `Connection timeout` → Network issue
  - `DNS error` → URL incorrect

## Step 2: Verify Webhook Endpoint URL

1. **In Stripe Dashboard → Webhooks:**
   - Check the endpoint URL is exactly: `https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/stripe-webhook`
   - Make sure there are no typos or extra characters

2. **Test the endpoint manually:**
   - The endpoint should be accessible (even if it returns an error without proper signature)
   - If you get `404 Not Found` → Function not deployed
   - If you get `401 Unauthorized` → JWT verification still ON

## Step 3: Check Webhook Events Configuration

1. **In Stripe Dashboard → Webhooks → Your endpoint:**
2. **Click "Edit destination"** or check "Listening to" section
3. **Verify these events are selected:**
   - ✅ `checkout.session.completed` (REQUIRED)
   - ✅ `payment_intent.succeeded` (backup)
   - ✅ `payment_intent.payment_failed` (error handling)

**If `checkout.session.completed` is NOT selected:**
- The webhook won't receive these events!
- Add it to the event list

## Step 4: Check Webhook Secret

1. **In Stripe Dashboard → Webhooks → Your endpoint:**
2. **Click "Reveal" next to "Signing secret"**
3. **Copy the secret** (starts with `whsec_...`)

4. **In Supabase Dashboard:**
   - Go to: Settings → Edge Functions → Secrets
   - Verify `STRIPE_WEBHOOK_SECRET` matches exactly
   - If different, update it and redeploy function

## Step 5: Manually Retry Failed Event

If you see a failed event:

1. **Click on the failed event** in Stripe Dashboard
2. **Click "Send again"** or "Retry" button
3. **Check Supabase logs** immediately after
4. **Check database** to see if tip updates

## Common Issues

### Issue 1: Event Not Selected
**Symptom:** No events in "Event deliveries" for `checkout.session.completed`

**Fix:**
- Go to webhook endpoint settings
- Add `checkout.session.completed` to events list
- Save

### Issue 2: Webhook Secret Mismatch
**Symptom:** Events show "Failed" with signature verification error

**Fix:**
- Get signing secret from Stripe Dashboard
- Update `STRIPE_WEBHOOK_SECRET` in Supabase
- Redeploy function (or wait a few minutes)

### Issue 3: JWT Verification Still ON
**Symptom:** Events show "Failed" with `401 Unauthorized`

**Fix:**
- Go to Supabase → Functions → `stripe-webhook` → Details
- Turn OFF "Verify JWT with legacy secret"
- Save

### Issue 4: Function Not Deployed
**Symptom:** Events show "Failed" with `404 Not Found`

**Fix:**
- Verify `stripe-webhook` function exists in Supabase
- Redeploy if needed

---

## Quick Test

After checking the above:

1. **Make a NEW test payment** (old events won't retry automatically)
2. **Immediately check Stripe Dashboard → Webhooks → Event deliveries**
3. **Look for the new event** - should show delivery attempt
4. **Check Supabase logs** - should show webhook processing

---

## What to Report Back

Please check and report:

1. **Event deliveries status:** Does the `checkout.session.completed` event from 7:09 PM show up in "Event deliveries"?
2. **If it shows up:** What's the status? (Succeeded/Failed/Pending)
3. **If Failed:** What's the error message?
4. **Events selected:** Is `checkout.session.completed` in the "Listening to" list?

This will help identify exactly why the webhook isn't working.
