# Database Migration Guide

## Issue
The `shelters` table is missing required columns, causing the scraper to fail with errors like:
- `column shelters.scan_status does not exist`
- `column shelters.city does not exist`
- `column shelters.last_scraped_at does not exist`

## Solution

### Option 1: Run Migration via Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run the Migration**
   - Open the file: `apps/wheretovacation/sql/FIX_SHELTERS_TABLE_COMPLETE.sql`
   - Copy the entire SQL script
   - Paste it into the SQL Editor
   - Click **Run** to execute

3. **Verify Migration**
   - The migration will add these columns:
     - `scan_status` (TEXT, default: 'unscanned')
     - `scanned_date` (TIMESTAMPTZ)
     - `last_scraped_at` (TIMESTAMPTZ)
     - `auto_scrape_enabled` (BOOLEAN, default: true)
     - `city` (TEXT)
     - `state` (TEXT)

### Option 2: Check Migration Status via API

You can check which columns are missing:

```bash
# Check migration status
curl http://localhost:3002/api/petreunion/migrate-shelters-table
```

This will return a JSON response showing which columns exist and which are missing.

### Option 3: Run Migration via API (if service role key is configured)

```bash
# Attempt to run migration (may require manual execution)
curl -X POST http://localhost:3002/api/petreunion/migrate-shelters-table
```

**Note:** This may not work if Supabase doesn't allow raw SQL execution via the JS client. In that case, use Option 1.

## After Migration

Once the migration is complete:

1. **Restart your dev server** (if running)
2. **Test the scraper** - it should now work without column errors
3. **Discover shelters** - Run "Discover Shelters" to populate the database
4. **Run scraper** - The scraper should now properly filter by city/state

## Verification

After running the migration, you should see:
- ✅ No more "column does not exist" errors
- ✅ Scraper can filter by city/state
- ✅ Scraper can track scan status
- ✅ All shelters marked as 'unscanned' by default

## Troubleshooting

If you still see errors after migration:

1. **Check column names** - Make sure they match exactly (case-sensitive in some databases)
2. **Check permissions** - Ensure your Supabase service role has ALTER TABLE permissions
3. **Run migration again** - The `IF NOT EXISTS` clauses make it safe to run multiple times
4. **Check logs** - Look at the Supabase logs for any SQL errors

