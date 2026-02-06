# How to See the 400 Error Message

## The Problem
Function returns 400, but we need to see the actual error message.

## Method 1: Check Function Logs

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Click on `stripe-webhook` function**
3. **Click "Logs" tab**
4. **Filter:** "Last hour" or "Last 24 hours"
5. **Look for:** `console.error()` messages around 16:33 (when the 400 happened)

**What to look for:**
- `ERROR: STRIPE_WEBHOOK_SECRET not configured`
- `ERROR: STRIPE_SECRET_KEY not configured`
- `ERROR: Missing stripe-signature header`
- `Webhook signature verification failed: ...`
- `Failed to log to debug_logs: ...`

## Method 2: Check if Response Body is Visible

In the Invocations tab, when you click on a 400 invocation:
- Look for a "Response" or "Response Body" section
- It might show the JSON error: `{"error": "..."}`

## Method 3: Check if debug_logs Table Exists

Run this SQL:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'debug_logs';
```

**If no rows:** The table doesn't exist, and the database logging is failing silently (but shouldn't cause 400 since it's in try-catch)

**If 1 row:** Table exists - check for recent entries:

```sql
SELECT event_type, payload, created_at
FROM debug_logs
ORDER BY created_at DESC
LIMIT 5;
```

---

## Most Likely Causes of 400

Based on the code, the function returns 400 in these cases:

1. **Missing STRIPE_WEBHOOK_SECRET** → But you confirmed it exists
2. **Missing STRIPE_SECRET_KEY** → But you confirmed it exists  
3. **Missing stripe-signature header** → Stripe always sends this
4. **Webhook signature verification failed** → Secret mismatch
5. **Error in catch block** → Some other error

---

**Check the Logs tab for console.error() messages - that will show the exact error!**
