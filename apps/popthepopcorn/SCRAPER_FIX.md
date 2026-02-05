# Scraper Schema Cache Fix

## 🐛 Issue

The scraper is failing with:
```
Error: Could not find the 'bias_label' column of 'headlines' in the schema cache
```

## ✅ Root Cause

The `bias_label` column **exists** in the database schema, but Supabase's schema cache is stale. This happens when:
1. Schema is updated but cache isn't refreshed
2. Database was created before the column was added
3. Schema cache wasn't reloaded after schema changes

## 🔧 Fix

### Option 1: Refresh Schema Cache (Recommended)

1. Go to: **Supabase Dashboard → Settings → API**
2. Scroll to **"Schema Cache"** section
3. Click **"Reload schema cache"** button
4. Wait 10-30 seconds

### Option 2: Run SQL Command

1. Go to: **Supabase Dashboard → SQL Editor**
2. Run this command:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
3. Wait 10-30 seconds

### Option 3: Run Fix Script

1. Go to: **Supabase Dashboard → SQL Editor**
2. Open: `apps/popthepopcorn/supabase/fix-schema-cache.sql`
3. Copy and paste the entire contents
4. Click **"Run"**
5. This will:
   - Ensure the column exists (defensive)
   - Refresh the schema cache
   - Verify the column

## ✅ Verification

After refreshing the cache, verify it works:

1. **Check Column Exists:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'headlines' 
   AND column_name = 'bias_label';
   ```
   Should return: `bias_label | text`

2. **Test Scraper:**
   - Visit `/admin` page
   - Click "Run Scraper"
   - Should no longer see `bias_label` errors

3. **Check Logs:**
   - Errors should stop appearing
   - Headlines should insert successfully

## 📋 Additional Notes

### PERPLEXITY_API_KEY Warning

The `[V-Agent] PERPLEXITY_API_KEY not set` warnings are **expected** if you haven't set the API key. The scraper will use basic verification instead of AI-powered verification.

**To fix (optional):**
1. Get API key from: https://www.perplexity.ai/settings/api
2. Add to Vercel env vars: `PERPLEXITY_API_KEY`
3. Redeploy

### Schema Cache Best Practices

**Always refresh schema cache after:**
- Adding new columns
- Modifying column types
- Adding new tables
- Changing RLS policies

**How to remember:**
- After running `schema.sql` → Refresh cache
- After running `rls-policies.sql` → Refresh cache
- After any schema changes → Refresh cache

---

## 🚀 Quick Fix Command

```sql
-- Quick one-liner to refresh cache
NOTIFY pgrst, 'reload schema';
```

Run this in Supabase SQL Editor, wait 30 seconds, then try the scraper again.

---

**Status:** Ready to fix
**Priority:** High (blocks headline insertion)
