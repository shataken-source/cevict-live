# 🚨 CRITICAL: Supabase Keys Are Identical

## Problem

Your Supabase dashboard shows that the `anon public` key and `service_role secret` key appear to be **identical**. This is a **critical security vulnerability**.

## Why This Is Dangerous

- **`anon` key**: Public, safe for client-side use, respects Row Level Security (RLS)
- **`service_role` key**: Secret, bypasses ALL RLS, has full admin access

If they're the same:
- Your service_role key is effectively public
- Anyone can bypass all security policies
- Full database access is exposed
- This explains authentication/update failures

## ✅ Solution: Regenerate Service Role Key

### Step 1: Regenerate in Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to: **Settings** → **API**
3. Find the **"service_role secret"** section
4. Click **"Reset"** or **"Regenerate"** button
5. **Copy the NEW key immediately** (you won't see it again!)

### Step 2: Update Your `.env.local`

```bash
# In apps/smokersrights/.env.local
SUPABASE_SERVICE_ROLE_KEY=<paste the NEW regenerated key here>
```

### Step 3: Verify Keys Are Different

After regenerating, verify:

**New Supabase Format (2024+):**
- `anon` key: Should start with `sb_publishable_` (public)
- `service_role` key: Should start with `sb_secret_` (secret)

**Old JWT Format (legacy):**
- `anon` key: Should start with `eyJhbGci...` (public, shorter)
- `service_role` key: Should start with `eyJhbGci...` but be **completely different** (secret, longer, 200+ chars)

**They should NOT match!** The prefixes should be different (new format) or the full keys should be different (old format).

### Step 4: Test

```bash
cd apps/smokersrights
npm run check-env
npm run update-laws
```

## How to Verify Keys Are Different

Run this to check if your keys match (without exposing full keys):

```bash
cd apps/smokersrights
node -e "
require('dotenv').config({path:'.env.local'});
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonPrefix = anon.substring(0, 50);
const servicePrefix = service.substring(0, 50);
console.log('Anon key prefix:', anonPrefix);
console.log('Service key prefix:', servicePrefix);
console.log('Keys match:', anon === service ? '❌ CRITICAL: YES (BAD!)' : '✅ NO (GOOD)');
"
```

## Expected Behavior After Fix

- ✅ `npm run update-laws` should work
- ✅ Law updates should succeed
- ✅ No more "Invalid API key" errors
- ✅ Service role key has proper permissions

## Important Notes

- **Never commit** service_role keys to git
- **Never expose** service_role keys in client-side code
- **Only use** service_role key in server-side code (API routes, scripts)
- **Use anon key** for client-side (React components, public pages)

## If Regeneration Doesn't Work

If Supabase won't let you regenerate, or keys still match:

1. **Contact Supabase Support** - This is a platform issue
2. **Create a new Supabase project** and migrate data
3. **Check if you're viewing the wrong project** in the dashboard

---

**Status:** ⚠️ **URGENT** - Fix immediately before continuing with law updates.
