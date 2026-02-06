# Database Migration Audit - FREE to PRO Database

## Overview
After migrating from FREE database (`nqkbqtiramecvmmpaxzk`) to PRO database (`rdbuwyefbgnbuhmjrizo`), we need to verify all apps are properly configured and all migrations/schemas are applied.

---

## Apps Using Supabase

### ✅ 1. petreunion
**Status:** ✅ MIGRATED
- **Database URL:** Uses `NEXT_PUBLIC_SUPABASE_URL` env var
- **Migrations:** Multiple SQL files in `supabase/` directory
- **Action Required:** 
  - ✅ URL already replaced via `replace-free-with-pro-database.ps1`
  - ⚠️ **CRITICAL:** Run all SQL migrations in PRO database:
    - `supabase/zapier-pet-of-day-lost-pets.sql` (creates `pet_of_day_log` table and function)
    - `supabase/pet-of-the-day-schema.sql` (if exists)
  - ⚠️ Verify `get_next_pet_of_day()` function exists and works

### ⚠️ 2. gulfcoastcharters
**Status:** NEEDS VERIFICATION
- **Database URL:** Uses `NEXT_PUBLIC_SUPABASE_URL` env var
- **Migrations:** 30+ migration files in `supabase/migrations/`
- **Action Required:**
  - ✅ Check `.env.local` has PRO database URL
  - ⚠️ **CRITICAL:** Run ALL migrations in PRO database in order:
    ```
    20240119_biometric_auth.sql
    20240120_avatar_analytics_functions.sql
    20240121_custom_emails.sql
    20240122_rls_policies.sql
    20240122_enable_rls.sql
    20240123_captain_reminders.sql
    20240124_multi_day_trips.sql
    20240125_weather_alerts.sql
    20240126_affiliate_credentials.sql
    20240128_points_avatar_system.sql
    20240128_media_uploads.sql
    20240128_email_campaigns.sql
    20260118_message_board.sql
    20260118_community_events.sql
    20260118_community_core.sql
    20260118_create_fishy_learning_tables.sql
    20260118_weather_alert_logs.sql
    20260118_weather_alert_cron.sql
    20260119_vessels.sql
    20260119_captain_applications.sql
    20260119_gps_live_tracking.sql
    20260119_scraper_core.sql
    20260119_stripe_payment_columns.sql
    20260119_gamification_tables.sql
    20260119_sms_reminder_system.sql
    20260119_sms_notifications_system.sql
    20260119_sms_campaign_system.sql
    20260119_social_shares_system.sql
    20260119_link_click_tracking.sql
    20260119_fish_recognition_corrections.sql
    20260119_fishing_license_system.sql
    20260119_monetization_system.sql
    20260119_uscg_integration.sql
    ```
  - ⚠️ Verify all Supabase Edge Functions are deployed
  - ⚠️ Check RLS policies are enabled

### ⚠️ 3. prognostication
**Status:** NEEDS VERIFICATION
- **Database URL:** Uses `NEXT_PUBLIC_SUPABASE_URL` env var
- **Migrations:** `migrations/create-sms-tables.sql`
- **Action Required:**
  - ✅ Check `.env.local` has PRO database URL
  - ⚠️ Run migration: `migrations/create-sms-tables.sql`
  - ⚠️ Verify tables exist: `sms_subscriptions`, `sms_campaigns`, etc.

### ⚠️ 4. popthepopcorn
**Status:** NEEDS VERIFICATION
- **Database URL:** Uses `NEXT_PUBLIC_SUPABASE_URL` env var
- **Schema Files:** Multiple SQL files in `supabase/` directory
- **Action Required:**
  - ✅ Check `.env.local` has PRO database URL
  - ⚠️ **CRITICAL:** Run schema files in PRO database:
    - `supabase/schema.sql` (main schema)
    - `supabase/rls-policies.sql` (RLS policies)
    - `supabase/story-arcs-schema.sql` (if needed)
    - `supabase/default-settings.sql` (if needed)
  - ⚠️ Verify tables: `headlines`, `trending_topics`, `story_arcs`, `reactions`, etc.

### ⚠️ 5. smokersrights
**Status:** NEEDS VERIFICATION
- **Database URL:** Uses `NEXT_PUBLIC_SUPABASE_URL` env var
- **Documentation:** `UPDATE_SUPABASE_CONFIG.md` exists
- **Action Required:**
  - ✅ Check `.env.local` has PRO database URL (`rdbuwyefbgnbuhmjrizo`)
  - ⚠️ Verify tables exist: `laws`, `products`, etc.
  - ⚠️ Run any schema setup if needed

### ⚠️ 6. wheretovacation
**Status:** NEEDS VERIFICATION
- **Database URL:** Uses `NEXT_PUBLIC_SUPABASE_URL` env var
- **Migrations:** 
  - `supabase/migrations/20260118_create_all_tables.sql`
  - `supabase/migrations/20260118_create_fishy_learning_tables.sql`
- **Action Required:**
  - ✅ Check `.env.local` has PRO database URL
  - ⚠️ Run migrations in PRO database
  - ⚠️ Verify Supabase Edge Function `fishy-ai-assistant` is deployed

### ⚠️ 7. alpha-hunter
**Status:** NEEDS VERIFICATION
- **Database URL:** Uses `NEXT_PUBLIC_SUPABASE_URL` env var (via `supabase-memory.ts`)
- **Migrations:** 
  - `database/migrations/001_bot_memory_tables.sql`
  - `database/migrations/002_bot_config_and_strategy_params.sql`
- **Action Required:**
  - ✅ Check `.env.local` has PRO database URL
  - ⚠️ Run migrations in PRO database
  - ⚠️ Verify tables: `bot_memory`, `bot_config`, `strategy_params`, etc.

### ⚠️ 8. progno
**Status:** NEEDS VERIFICATION
- **Database URL:** Likely uses Supabase (check `app/lib/progno-db.ts`)
- **Action Required:**
  - ✅ Check `.env.local` has PRO database URL
  - ⚠️ Verify database connection and tables exist
  - ⚠️ Check for any migration files

---

## Quick Verification Script

Run this in PRO database SQL Editor to check which tables exist:

```sql
-- Check all tables across schemas
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Migration Checklist

### Step 1: Environment Variables
- [ ] Verify all `.env.local` files use PRO database URL
- [ ] Verify all service role keys are updated
- [ ] Check Vercel environment variables (if deployed)

### Step 2: Run Migrations (Priority Order)
1. [ ] **gulfcoastcharters** - 30+ migrations (HIGHEST PRIORITY - most complex)
2. [ ] **petreunion** - Pet of the Day function
3. [ ] **popthepopcorn** - Schema and RLS policies
4. [ ] **prognostication** - SMS tables
5. [ ] **wheretovacation** - All tables and Fishy AI
6. [ ] **alpha-hunter** - Bot memory tables
7. [ ] **smokersrights** - Verify tables exist
8. [ ] **progno** - Verify connection

### Step 3: Verify Functions
- [ ] `get_next_pet_of_day()` (petreunion)
- [ ] All Supabase Edge Functions deployed
- [ ] All RLS policies enabled

### Step 4: Test Each App
- [ ] Test database connections
- [ ] Test CRUD operations
- [ ] Test API endpoints
- [ ] Check for error logs

---

## Files Still Referencing FREE Database

These files still contain references to the old FREE database:
- `apps/petreunion/verify-before-copy.ts` (intentional - needs both)
- `apps/petreunion/check-schemas.ts` (intentional - needs both)
- `apps/petreunion/recover-all-pets.ts` (intentional - needs both)
- `apps/smokersrights/UPDATE_SUPABASE_CONFIG.md` (documentation)
- `apps/alpha-hunter/database/SETUP_SUPABASE_MEMORY.md` (documentation)

**Note:** Recovery scripts intentionally keep FREE URL for data migration purposes.

---

## Critical Actions Required

### 🔴 HIGH PRIORITY
1. **gulfcoastcharters** - Run all 30+ migrations in PRO database
2. **petreunion** - Verify `get_next_pet_of_day()` function works
3. **popthepopcorn** - Run schema.sql and RLS policies

### 🟡 MEDIUM PRIORITY
4. **prognostication** - Run SMS tables migration
5. **wheretovacation** - Run table migrations
6. **alpha-hunter** - Run bot memory migrations

### 🟢 LOW PRIORITY
7. **smokersrights** - Verify tables exist
8. **progno** - Verify connection

---

## Next Steps

1. **Create migration runner script** to apply all migrations in order
2. **Create verification script** to check all tables/functions exist
3. **Test each app** after migrations are applied
4. **Update documentation** with PRO database URL
