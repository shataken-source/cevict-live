# Debug Checkout 500 Error

## Current Issue
Getting `500 Internal Server Error` when calling `/api/tips/checkout`

## What to Check

### 1. Check Terminal Logs
Look in the terminal where `npm run dev` is running. You should see:
- `Creating Stripe checkout for tip: { tipId, amount, bookingId }`
- `Stripe checkout error:` (if the Edge Function call fails)
- `Checkout error details:` (full error object)

### 2. Common Causes

#### A. Edge Function Not Deployed
**Symptom:** Error like "Function not found" or 404

**Fix:**
1. Go to Supabase Dashboard → Edge Functions
2. Check if `stripe-checkout` function exists
3. If not, deploy it:
   ```bash
   cd apps/gulfcoastcharters
   supabase functions deploy stripe-checkout
   ```

#### B. Missing STRIPE_SECRET_KEY
**Symptom:** Error like "STRIPE_SECRET_KEY not configured"

**Fix:**
1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Add: `STRIPE_SECRET_KEY=sk_test_...` (use test key for development)
3. Redeploy the function

#### C. Edge Function Error
**Symptom:** Error from the Edge Function itself

**Check:**
- Look at Supabase Dashboard → Edge Functions → stripe-checkout → Logs
- Check for runtime errors

### 3. Quick Test

Test the Edge Function directly:

```javascript
// In browser console (on your Supabase project)
const response = await fetch('https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/stripe-checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({
    type: 'tip',
    amount: 20.00,
    customerEmail: 'test@example.com',
    successUrl: 'http://localhost:3001/success',
    cancelUrl: 'http://localhost:3001/cancel',
    metadata: {
      tip_id: 'test-tip-id',
      booking_id: 'test-booking-id'
    }
  })
});

const data = await response.json();
console.log(data);
```

### 4. Check Server Logs

The Next.js API route now logs:
- When checkout is being created
- Full error details if it fails

Check your terminal for these logs.

## Next Steps

1. **Check terminal logs** - Look for the error message
2. **Share the error** - Copy the error from terminal and share it
3. **Check Edge Function** - Verify it's deployed and has secrets configured
