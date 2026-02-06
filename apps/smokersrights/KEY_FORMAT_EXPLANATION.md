# Supabase API Key Format Explanation

## ✅ Your Keys Are Correct!

Based on your Supabase dashboard, your keys are using the **new Supabase API key format** (introduced in 2024), which makes it very clear that they are different:

- **Publishable key (anon)**: `sb_publishable_X0BWdhhFw1i03UUOT2sB1Q_RWL8N...`
- **Secret key (service_role)**: `sb_secret_arc67...`

These are **completely different keys** and this is the correct configuration.

## Key Format Evolution

### Old Format (Legacy JWT)
- Both keys started with `eyJhbGci...` (JWT header)
- Harder to distinguish at a glance
- Both were JWT tokens, just with different payloads
- Example:
  - Anon: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkYnV3eWVmYmduYnVobWpyaXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU5NzQ4NDQsImV4cCI6MjAyMTU1MzQ0NH0...`
  - Service: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkYnV3eWVmYmduYnVobWpyaXpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNTk3NDg0NCwiZXhwIjoyMDIxNTUzNDQ0fQ...`

### New Format (Current)
- Clear prefixes: `sb_publishable_` vs `sb_secret_`
- Immediately distinguishable
- More secure and user-friendly
- Example:
  - Anon: `sb_publishable_X0BWdhhFw1i03UUOT2sB1Q_RWL8N...`
  - Service: `sb_secret_arc67...`

## Using the New Format

The Supabase JavaScript client library supports both formats. Simply use the keys as shown in your dashboard:

```bash
# In .env.local
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_X0BWdhhFw1i03UUOT2sB1Q_RWL8N...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_arc67...
```

## Verification

Run the check script to verify your configuration:

```bash
cd apps/smokersrights
npm run check-env
```

The script will:
- ✅ Detect the new format
- ✅ Confirm keys are different
- ✅ Show key prefixes (without exposing full keys)

## Next Steps

1. **Copy the keys from your dashboard:**
   - Go to Settings → API
   - Copy the `default` publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the `default` secret key → `SUPABASE_SERVICE_ROLE_KEY`

2. **Update `.env.local`:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_X0BWdhhFw1i03UUOT2sB1Q_RWL8N...
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_arc67...
   ```

3. **Test:**
   ```bash
   npm run check-env
   npm run update-laws
   ```

## Summary

- ✅ Your keys are different (good!)
- ✅ Using new Supabase format (modern!)
- ✅ No security issue
- ✅ Ready to use

The confusion earlier was because the old JWT format made keys look similar at first glance. The new format makes it crystal clear they're different.
