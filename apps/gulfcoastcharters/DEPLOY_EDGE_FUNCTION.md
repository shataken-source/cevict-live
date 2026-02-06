# Deploy Stripe Checkout Edge Function

## Quick Deploy Options

### Option 1: Use Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo
2. Navigate to **Edge Functions**
3. Click **Create a new function**
4. Name it: `stripe-checkout`
5. Copy the contents of `supabase/functions/stripe-checkout/index.ts` into the editor
6. Click **Deploy**

### Option 2: Install Supabase CLI via Scoop

```powershell
# Install Scoop if you don't have it
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Add Supabase bucket
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# Install Supabase CLI
scoop install supabase
```

### Option 3: Download Binary

1. Download from: https://github.com/supabase/cli/releases/latest
2. Extract and add to PATH
3. Or use directly: `.\supabase.exe functions deploy stripe-checkout`

## After CLI is Installed

```powershell
cd c:\cevict-live\apps\gulfcoastcharters

# Login
supabase login

# Link project
supabase link --project-ref rdbuwyefbgnbuhmjrizo

# Deploy function
supabase functions deploy stripe-checkout

# Set Stripe secret
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

## Set Stripe Secret in Dashboard

If you used the Dashboard to deploy:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Click **Add new secret**
3. Name: `STRIPE_SECRET_KEY`
4. Value: Your Stripe test key (starts with `sk_test_`)
5. Click **Save**

## Verify Deployment

After deploying, test the function:

```powershell
# The function should be available at:
# https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/stripe-checkout
```

## Next Steps

Once deployed, try submitting a tip again. The 401 error should be resolved!
