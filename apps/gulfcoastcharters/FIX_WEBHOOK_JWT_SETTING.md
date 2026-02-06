# Fix Webhook: Turn OFF JWT Verification

## Problem
- ✅ Webhook endpoint exists in Stripe
- ✅ Webhook is receiving events (18 events)
- ❌ **100% Error Rate** - All events are failing
- ❌ Tips stuck in `pending` status

## Root Cause
The `stripe-webhook` function has **"Verify JWT with legacy secret"** turned **ON**.

Stripe webhooks don't include Supabase JWT tokens - they use Stripe's own signature verification. When the Supabase gateway requires JWT verification, it rejects all Stripe webhook requests with `401 Unauthorized` **before your function code even runs**.

## Fix: Turn OFF JWT Verification

### Step 1: Go to Function Settings

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Click on `stripe-webhook` function**
3. **Click "Details" tab** (or "Settings" tab)

### Step 2: Turn OFF JWT Verification

1. **Find the setting:** "Verify JWT with legacy secret"
2. **Toggle it OFF** (should be gray/unchecked, not green)
3. **Click "Save"** or "Update" (if there's a save button)

**What this does:**
- Allows Stripe webhooks to reach your function code
- Your function still verifies the webhook signature using `STRIPE_WEBHOOK_SECRET`
- This is the correct security model for webhooks

### Step 3: Verify the Fix

1. **Go to Stripe Dashboard:** https://dashboard.stripe.com/test/webhooks
2. **Click on your webhook endpoint**
3. **Click "Send test webhook"**
4. **Select event:** `checkout.session.completed`
5. **Click "Send test webhook"**

**Expected Result:**
- ✅ Status: "Succeeded" (green checkmark)
- ✅ Response: `200 OK`
- ✅ Error rate should drop from 100% to 0%

### Step 4: Test with Real Payment

1. **Make a new test tip payment** (old payments won't retry automatically)
2. **Check database** - tip status should update to `completed` within seconds
3. **Check Stripe Dashboard** - new event should show "Succeeded"

---

## Why This is Safe

Turning OFF JWT verification for webhooks is **safe and correct** because:

1. **Stripe verifies the request** using the `stripe-signature` header
2. **Your function code verifies the signature** using `STRIPE_WEBHOOK_SECRET`
3. **Only Stripe can generate valid signatures** - no one else can fake a webhook
4. **This is the standard pattern** for webhook endpoints

The JWT verification is meant for user-facing API calls, not external webhook services.

---

## After Fixing

Once JWT verification is OFF:

1. ✅ Webhook events will reach your function
2. ✅ Function will verify Stripe signature
3. ✅ Tips will update to `completed` status
4. ✅ Error rate will drop to 0%

---

## Quick Checklist

- [ ] "Verify JWT with legacy secret" is **OFF** (gray/unchecked)
- [ ] Test webhook event succeeds (200 OK)
- [ ] Error rate drops to 0%
- [ ] New tip payment updates to `completed` status
