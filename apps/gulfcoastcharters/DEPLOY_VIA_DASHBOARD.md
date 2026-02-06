# Deploy Edge Function via Supabase Dashboard

Since the Supabase CLI isn't installed, you can deploy/update the function directly in the Dashboard.

## Option 1: Update Function Settings in Dashboard

1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. Click on `stripe-checkout` function
3. Look for **Settings** or **Configuration** tab
4. Find options like:
   - "Verify JWT" - **Turn this OFF**
   - "Enforce Sign-In" - **Turn this OFF**
   - "Require Authentication" - **Turn this OFF**
5. Save the changes

This should have the same effect as `--no-verify-jwt`.

## Option 2: Redeploy Function via Dashboard

If you need to update the function code:

1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. Click on `stripe-checkout` function
3. Click **Edit** or **Deploy** button
4. Copy the code from `apps/gulfcoastcharters/supabase/functions/stripe-checkout/index.ts`
5. Paste it into the editor
6. Look for deployment settings and disable JWT verification
7. Click **Deploy**

## Option 3: Install Supabase CLI (Alternative Methods)

### Method A: Download Binary Directly

1. Go to: https://github.com/supabase/cli/releases/latest
2. Download `supabase_windows_amd64.zip` (or appropriate version)
3. Extract to a folder (e.g., `C:\tools\supabase`)
4. Add to PATH, or use full path:
   ```powershell
   C:\tools\supabase\supabase.exe functions deploy stripe-checkout --no-verify-jwt
   ```

### Method B: Install Scoop First, Then Supabase

```powershell
# Install Scoop
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Then install Supabase
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

## Quick Test: Check Dashboard Settings First

**Try Option 1 first** - it's the fastest. Just go to the Dashboard and turn off JWT verification for the function. This should immediately fix the 401 error.
