# Update Edge Function via Dashboard

## The Problem

The currently deployed `stripe-checkout` function:
- ❌ Requires user authentication (`supabase.auth.getUser()`)
- ❌ Doesn't handle `type: 'tip'`
- ❌ Returns 401 for service role calls

Our local version:
- ✅ Handles tips, bookings, gift cards, etc.
- ✅ Works with service role key
- ✅ No user auth required

## Solution: Deploy Our Version

### Step 1: Copy the Function Code

1. Open: `apps/gulfcoastcharters/supabase/functions/stripe-checkout/index.ts`
2. Copy ALL the code (Ctrl+A, Ctrl+C)

### Step 2: Update in Dashboard

1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. Click on `stripe-checkout` function
3. Click **Edit** or **Deploy** button
4. **Delete all existing code** in the editor
5. **Paste our code** (Ctrl+V)
6. **Turn OFF "Verify JWT"** toggle (if visible)
7. Click **Deploy** or **Save**

### Step 3: Set Required Secrets

Make sure these secrets are set in Dashboard:

1. Go to: **Project Settings** → **Edge Functions** → **Secrets**
2. Ensure these exist:
   - `STRIPE_SECRET_KEY` = your Stripe test key (starts with `sk_test_`)
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
   - `SUPABASE_URL` = your Supabase URL (usually auto-set)

### Step 4: Test

After deploying:
1. Refresh your browser
2. Try submitting a tip
3. Should work now! ✅

## Alternative: Keep Both Functions

If you need the subscription function too, you could:
- Rename the current one to `stripe-checkout-subscription`
- Deploy our version as `stripe-checkout`
- Update the API route to call the correct function

But for now, just replace the existing one with our version.
