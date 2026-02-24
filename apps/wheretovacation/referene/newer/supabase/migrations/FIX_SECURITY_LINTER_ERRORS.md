# Fix Supabase Security Linter Errors

## Overview
This migration fixes all security linter errors reported by Supabase:
- ✅ Enables RLS on all public tables
- ✅ Creates appropriate RLS policies
- ✅ Fixes SECURITY DEFINER view issue

## How to Apply

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**

### Step 2: Run the Migration
1. Open the file: `apps/wheretovacation/supabase/migrations/20250123_fix_security_linter_errors.sql`
2. Copy all the SQL code
3. Paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait for "Success" message

### Step 3: Verify
Run this query to verify RLS is enabled:
```sql
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'badges',
  'daily_check_ins',
  'notification_log',
  'weather_data',
  'weather_alerts',
  'conversations',
  'spatial_ref_sys'
)
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

## What This Fixes

### 1. RLS Disabled Errors
- ✅ `badges` - Public read, admin write
- ✅ `daily_check_ins` - User-specific access
- ✅ `notification_log` - User-specific access
- ✅ `weather_data` - Public read, admin/service write
- ✅ `weather_alerts` - User-specific (booking-related)
- ✅ `conversations` - User-specific (participants only)
- ✅ `spatial_ref_sys` - Public read-only (PostGIS system table)

### 2. SECURITY DEFINER View
- ✅ Recreates `wtv_boats_needing_processing` view without SECURITY DEFINER
- ✅ View now respects RLS policies from underlying `boats` table

## Security Policies Created

### Public Read Access
- `badges` - Anyone can view badges
- `weather_data` - Anyone can view weather data
- `spatial_ref_sys` - Anyone can view spatial reference data

### User-Specific Access
- `daily_check_ins` - Users can only see/manage their own check-ins
- `notification_log` - Users can only see their own notifications
- `weather_alerts` - Users see alerts for their bookings
- `conversations` - Users see conversations they're part of

### Admin Access
- `badges` - Admins can manage badges
- `weather_data` - Admins can manage weather data

### Service Role Access
- `notification_log` - Service role can insert (for system notifications)
- `weather_data` - Service role can insert (for automated updates)
- `weather_alerts` - Service role can insert (for automated alerts)

## Notes

- **Service Role**: The service role key bypasses RLS, so policies with `WITH CHECK (true)` allow service role inserts
- **PostGIS Table**: `spatial_ref_sys` is a PostGIS system table that should remain read-only
- **View Security**: The view is recreated without SECURITY DEFINER, so it respects RLS from the underlying table

## After Running

1. ✅ All linter errors should be resolved
2. ✅ Tables are now properly secured
3. ✅ Users can only access their own data
4. ✅ Public data is readable by everyone
5. ✅ Admin functions work correctly

