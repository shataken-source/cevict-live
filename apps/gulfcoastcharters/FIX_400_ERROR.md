# Fix 400 Bad Request Errors

## Good News
✅ All required secrets are set:
- `STRIPE_SECRET_KEY` ✅
- `STRIPE_WEBHOOK_SECRET` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `SUPABASE_URL` ✅

## The Problem
Function is returning `400 Bad Request` - need to see the actual error message.

## Step 1: Check Error Details in Supabase

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Click on `stripe-webhook` function**
3. **Click "Invocations" tab**
4. **Click on the most recent `400` invocation** (should be expandable)
5. **Look for:**
   - Error message
   - Response body
   - Stack trace

**What you're looking for:**
- The actual error message that's causing the 400

## Step 2: Most Likely Issues

### Issue 1: Webhook Secret Mismatch
**Symptom:** Error like "Webhook signature verification failed"

**Fix:**
1. Go to Stripe Dashboard → Webhooks → Your endpoint
2. Click "Reveal" next to "Signing secret"
3. Copy the `whsec_...` value
4. Go to Supabase → Settings → Functions → Secrets
5. Update `STRIPE_WEBHOOK_SECRET` with the new value
6. Redeploy function

### Issue 2: Function Code Not Deployed
**Symptom:** Error might be from old function code

**Fix:**
1. Verify deployed code matches local code
2. Copy ALL code from `apps/gulfcoastcharters/supabase/functions/stripe-webhook/index.ts`
3. Paste into Supabase Dashboard → Functions → `stripe-webhook` → Code
4. Click "Deploy" (not just "Save")

### Issue 3: Database Error
**Symptom:** Error like "relation debug_logs does not exist" or RLS error

**Fix:**
- Make sure `CREATE_DEBUG_LOGS_TABLE.sql` was run successfully
- Check if `debug_logs` table exists

---

## Step 3: Check Function Logs

Even with 400 errors, logs might show something:

1. **Go to:** Functions → `stripe-webhook` → Logs
2. **Filter:** "Last hour" or "Last 24 hours"
3. **Look for:** Any `console.error()` messages

---

## Quick Test: Check if debug_logs Table Exists

Run this SQL:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'debug_logs';
```

**If no rows:** Table doesn't exist - run `CREATE_DEBUG_LOGS_TABLE.sql` again

**If 1 row:** Table exists - the error is something else

---

**What error message do you see when you click on a 400 invocation?**
