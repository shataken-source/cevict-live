# Fix PostgREST Schema Cache Issue

## Problem

Error: `Could not find the table 'public.laws' in the schema cache`

This is a PostgREST schema cache issue (similar to the Kalshi bot's `PGRST205` error). PostgREST (Supabase's API layer) can't see the `laws` table even though it might exist in the database.

## Solution

### Step 1: Run the Fix SQL Script

1. **Open Supabase Dashboard:**
   - Go to your project: `rdbuwyefbgnbuhmjrizo`
   - Navigate to: **SQL Editor**

2. **Run the fix script:**
   - Open: `apps/smokersrights/FIX_LAWS_TABLE_AND_SCHEMA.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**

This script will:
- ✅ Create the `laws` table if it doesn't exist
- ✅ Create necessary indexes
- ✅ Grant proper permissions to `anon`, `authenticated`, and `service_role`
- ✅ Set up Row Level Security (RLS) policies
- ✅ Attempt to refresh PostgREST schema cache

### Step 2: Wait for Schema Cache Refresh

After running the SQL:
- **Wait 30-60 seconds** for PostgREST to refresh its schema cache
- The `NOTIFY pgrst, 'reload schema'` command may or may not work in Supabase Cloud, but it's worth trying

### Step 3: Test

```bash
cd apps/smokersrights
npm run update-laws
```

### Step 4: If Still Fails

If you still get the schema cache error:

1. **Check if table exists in Supabase Dashboard:**
   - Go to **Table Editor**
   - Look for `laws` table
   - If it doesn't exist, the SQL script should have created it

2. **Check RLS policies:**
   - Go to **Authentication** → **Policies**
   - Look for `laws` table policies
   - Ensure there's a SELECT policy for public access

3. **Try restarting PostgREST (if possible):**
   - In Supabase Dashboard, go to **Settings** → **API**
   - Look for any "Restart" or "Reload" options
   - Or contact Supabase support

4. **Alternative: Use direct database connection:**
   - If PostgREST continues to fail, you might need to use a direct PostgreSQL connection
   - This would require changing the code to use `pg` library instead of Supabase client

## Expected Schema

The `laws` table should have these columns:

```sql
- id (UUID, primary key)
- state_code (TEXT)
- state_name (TEXT)
- category (TEXT)
- summary (TEXT)
- full_text (TEXT)
- effective_date (DATE)
- last_updated_at (TIMESTAMPTZ)
- source_url (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

## Verification

After running the fix, verify in Supabase Dashboard:

1. **Table Editor** → Should see `laws` table
2. **SQL Editor** → Run: `SELECT COUNT(*) FROM laws;`
3. **Authentication** → **Policies** → Should see policies for `laws` table

## Related Issues

- This is similar to the Kalshi bot's `PGRST205` error
- Both are PostgREST schema cache issues
- The fix involves granting permissions and refreshing the cache
