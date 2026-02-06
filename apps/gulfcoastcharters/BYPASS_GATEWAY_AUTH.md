# Bypass Gateway Auth for Edge Function

## If you're still getting 401 after adding explicit headers

The Supabase Gateway might be rejecting the service role key. You can bypass Gateway auth entirely and let the Edge Function handle its own security.

## Option 1: Deploy with --no-verify-jwt (Recommended for Testing)

This tells Supabase to skip JWT verification at the Gateway level. The Edge Function will still run, but you'll need to handle security inside the function itself.

### Steps:

1. **Install Supabase CLI** (if not already installed):
   ```powershell
   # Via Scoop (recommended)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   
   # Or download from: https://github.com/supabase/cli/releases
   ```

2. **Login and Link Project**:
   ```powershell
   cd c:\cevict-live\apps\gulfcoastcharters
   supabase login
   supabase link --project-ref rdbuwyefbgnbuhmjrizo
   ```

3. **Deploy with --no-verify-jwt**:
   ```powershell
   supabase functions deploy stripe-checkout --no-verify-jwt
   ```

4. **Test Again**:
   - Refresh your browser
   - Try submitting a tip
   - The 401 should be gone

## Option 2: Check Dashboard Settings

1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. Click on `stripe-checkout` function
3. Look for settings like:
   - "Enforce Sign-In"
   - "Verify JWT"
   - "Require Authentication"
4. **Turn OFF** any authentication requirements

## Option 3: Verify Project Reference

Check your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co
```

Make sure the URL matches your project reference (`rdbuwyefbgnbuhmjrizo`).

## Security Note

If you deploy with `--no-verify-jwt`:
- ✅ The Gateway won't check authentication
- ⚠️ Your Edge Function should validate requests internally
- ⚠️ Consider adding a secret token check in the Edge Function
- ⚠️ The function URL becomes publicly accessible (but your Next.js API route still protects it)

## Current Code Status

The code now explicitly sends both headers:
- `Authorization: Bearer ${serviceRoleKey}`
- `apikey: ${serviceRoleKey}`

If this still doesn't work, try Option 1 (deploy with --no-verify-jwt).
