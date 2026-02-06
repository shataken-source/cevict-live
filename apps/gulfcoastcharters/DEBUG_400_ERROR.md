# Debug 400 Bad Request Errors

## Problem
- ✅ Function is being called (Invocations > 0)
- ❌ All invocations return `400 Bad Request`
- ❌ No debug_logs entries (function failing before logging?)

## Step 1: Check Error Details in Supabase

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Click on `stripe-webhook` function**
3. **Click "Invocations" tab**
4. **Click on one of the `400` invocations** (the most recent one)
5. **Look for error details** - should show the actual error message

**Common errors you might see:**
- `STRIPE_WEBHOOK_SECRET not configured`
- `STRIPE_SECRET_KEY not configured`
- `Missing stripe-signature header`
- `Webhook signature verification failed: ...`

## Step 2: Check Environment Variables (Secrets)

The function needs these secrets in Supabase:

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/functions
2. **Click "Secrets" tab**
3. **Verify these exist:**
   - ✅ `STRIPE_WEBHOOK_SECRET` = `whsec_...` (from Stripe Dashboard)
   - ✅ `STRIPE_SECRET_KEY` = `sk_test_...` (your Stripe test key)
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` = `eyJ...` (your service role key)
   - ✅ `SUPABASE_URL` = `https://rdbuwyefbgnbuhmjrizo.supabase.co` (usually auto-set)

**If any are missing:** Add them and redeploy the function

## Step 3: Check Function Logs

Even though logs might not show, check:

1. **Go to:** Functions → `stripe-webhook` → Logs
2. **Look for:** Any `console.error()` messages
3. **Filter by:** "Last hour" or "Last 24 hours"

**What to look for:**
- `ERROR: STRIPE_WEBHOOK_SECRET not configured`
- `ERROR: STRIPE_SECRET_KEY not configured`
- `ERROR: Missing stripe-signature header`
- `Webhook signature verification failed`

## Step 4: Most Likely Issue

Based on the 400 errors, the most likely causes are:

### Issue 1: Missing STRIPE_WEBHOOK_SECRET
**Symptom:** Function returns 400 immediately

**Fix:**
1. Get webhook signing secret from Stripe Dashboard
2. Add to Supabase secrets as `STRIPE_WEBHOOK_SECRET`
3. Redeploy function

### Issue 2: Webhook Secret Mismatch
**Symptom:** Function returns 400 after signature verification

**Fix:**
1. Verify `STRIPE_WEBHOOK_SECRET` in Supabase matches Stripe Dashboard
2. Update if different
3. Redeploy function

### Issue 3: Missing stripe-signature Header
**Symptom:** Function returns 400 with "Missing stripe-signature header"

**Fix:**
- This shouldn't happen with real Stripe webhooks
- If you see this, Stripe isn't sending the signature (unlikely)

---

## Quick Fix Checklist

- [ ] Check Invocations tab for specific error message
- [ ] Verify all secrets are set in Supabase
- [ ] Check function Logs for error messages
- [ ] Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- [ ] Redeploy function after fixing secrets

---

**Click on a 400 invocation to see the exact error message!**
