# Deploy Webhook with Database Logging (Gemini's Solution)

## Problem
- Stripe shows 200 OK but no logs appear
- Tips remain pending
- Function code has logging but nothing shows up

## Solution: Use Database as Logger

Following Gemini's advice, we've added database logging to verify function execution.

## Step 1: Create Debug Logs Table

Run this SQL in Supabase SQL Editor:

```sql
-- File: supabase/migrations/20260125_create_debug_logs.sql
-- Copy the entire contents and run it
```

Or run directly:

```sql
CREATE TABLE IF NOT EXISTS public.debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON public.debug_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_event_type ON public.debug_logs(event_type);

ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert debug logs"
  ON public.debug_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read debug logs"
  ON public.debug_logs
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Anon can read debug logs"
  ON public.debug_logs
  FOR SELECT
  TO anon
  USING (true);
```

## Step 2: Deploy Updated Function

### Option A: Use Supabase Dashboard (Quick)

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Click on `stripe-webhook` function**
3. **Click "Code" tab**
4. **Copy ALL code from:** `apps/gulfcoastcharters/supabase/functions/stripe-webhook/index.ts`
5. **Paste into editor** (replace all existing code)
6. **Click "Deploy"** (not just "Save")

**Important:** Make sure you click "Deploy" - "Save" might not actually deploy!

### Option B: Use Supabase CLI (Recommended by Gemini)

```powershell
cd apps/gulfcoastcharters

# If you have Supabase CLI installed:
supabase functions deploy stripe-webhook --no-verify-jwt
```

## Step 3: Test and Check Database

1. **Make a new test payment:**
   - Go to: http://localhost:3001/test-tip
   - Submit a tip payment

2. **Check debug_logs table:**
   ```sql
   SELECT 
     event_type,
     payload,
     created_at
   FROM debug_logs
   ORDER BY created_at DESC
   LIMIT 10;
   ```

**Expected results:**
- ✅ `webhook_request_received` - Function was called
- ✅ `webhook_body_received` - Body was received
- ✅ `webhook_signature_verified` - Signature verified
- ✅ `checkout_session_metadata` - Metadata extracted
- ✅ `tip_processing_started` - Tip processing began
- ✅ `tip_update_success` - Tip was updated (or `tip_update_error` if it failed)

## Step 4: Check Invocations Tab

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Click on `stripe-webhook` function**
3. **Click "Invocations" tab** (not "Logs")
4. **Check if invocations count > 0**

**If invocations = 0:**
- Requests aren't reaching your function
- Gateway is blocking them (check JWT setting again)

**If invocations > 0:**
- Function is being called
- Check debug_logs table to see what happened

## Step 5: Check Logs (Now with console.error)

The updated function uses `console.error()` instead of `console.log()` for better visibility:

1. **Go to:** Functions → `stripe-webhook` → Logs
2. **Look for:** `=== WEBHOOK REQUEST RECEIVED ===`
3. **Should see:** All processing steps with `console.error()`

## What Changed

1. ✅ **Database logging added** - Logs to `debug_logs` table at every step
2. ✅ **Logging moved to first line** - Before any CORS checks
3. ✅ **console.error() instead of console.log()** - Better visibility
4. ✅ **Signature failure returns 400** - So Stripe shows it as failed
5. ✅ **Error logging to database** - Even errors are logged to DB

## Troubleshooting

### If debug_logs table is empty:
- Function isn't executing at all
- Check "Invocations" tab - if 0, gateway is blocking
- Verify JWT verification is OFF

### If you see `webhook_request_received` but nothing else:
- Function is executing but failing early
- Check the payload in debug_logs to see where it stopped

### If you see `tip_update_error`:
- Check the error payload in debug_logs
- Likely RLS or database constraint issue

---

## Quick Query to Check Webhook Activity

```sql
-- See all webhook activity
SELECT 
  event_type,
  payload->>'timestamp' as timestamp,
  payload
FROM debug_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

**After deploying, make a test payment and check the debug_logs table!**
