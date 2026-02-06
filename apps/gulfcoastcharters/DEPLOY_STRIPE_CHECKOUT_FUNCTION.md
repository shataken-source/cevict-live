# Deploy Stripe Checkout Edge Function

## Quick Check

The Edge Function might not be deployed to Supabase. Follow these steps:

## 1. Check if Function Exists

Go to your Supabase Dashboard:
- Navigate to **Edge Functions** → Check if `stripe-checkout` exists

## 2. Deploy the Function

If it doesn't exist, deploy it:

```bash
cd apps/gulfcoastcharters

# Make sure you're logged in to Supabase CLI
supabase login

# Link to your project (if not already linked)
supabase link --project-ref rdbuwyefbgnbuhmjrizo

# Deploy the function
supabase functions deploy stripe-checkout
```

## 3. Set Required Secrets

The Edge Function needs these secrets configured:

```bash
# Set STRIPE_SECRET_KEY (use your test key for development)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...

# Verify secrets are set
supabase secrets list
```

**OR** set them in the Dashboard:
- Go to **Project Settings** → **Edge Functions** → **Secrets**
- Add: `STRIPE_SECRET_KEY` = `sk_test_...` (your Stripe test key)

## 4. Verify Deployment

After deploying, the function should be available at:
```
https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/stripe-checkout
```

## 5. Test the Function

You can test it directly using curl or the Supabase Dashboard:

```bash
curl -X POST https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/stripe-checkout \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "tip",
    "amount": 20.00,
    "customerEmail": "test@example.com",
    "successUrl": "http://localhost:3001/success",
    "cancelUrl": "http://localhost:3001/cancel",
    "metadata": {
      "tip_id": "test-tip-id",
      "booking_id": "test-booking-id"
    }
  }'
```

## Common Issues

### Issue: Function Not Found (404)
**Solution:** Deploy the function (Step 2)

### Issue: Unauthorized (401)
**Solution:** Make sure you're using the **service role key** (not anon key) in the Authorization header

### Issue: STRIPE_SECRET_KEY not configured
**Solution:** Set the secret (Step 3)

### Issue: Function Error (500)
**Solution:** Check the Edge Function logs in Supabase Dashboard → Edge Functions → stripe-checkout → Logs
