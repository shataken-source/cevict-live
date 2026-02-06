# ============================================
# Run All Migrations - PRO Database
# This script lists all migrations that need to be run
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Migration Runner" -ForegroundColor Cyan
Write-Host "PRO Database: rdbuwyefbgnbuhmjrizo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get Supabase URL and key from user
$supabaseUrl = Read-Host "Enter PRO Supabase URL (or press Enter for rdbuwyefbgnbuhmjrizo)"
if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
    $supabaseUrl = "https://rdbuwyefbgnbuhmjrizo.supabase.co"
}

$supabaseKey = Read-Host "Enter Supabase Service Role Key" -AsSecureString
$supabaseKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($supabaseKey)
)

Write-Host ""
Write-Host "Migration files to run:" -ForegroundColor Yellow
Write-Host ""

# List all migration files
$migrations = @(
    @{App="gulfcoastcharters"; File="supabase/migrations/20240119_biometric_auth.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20240120_avatar_analytics_functions.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20240121_custom_emails.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20240122_rls_policies.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20240122_enable_rls.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20240123_captain_reminders.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20240124_multi_day_trips.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20240125_weather_alerts.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20240126_affiliate_credentials.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20240128_points_avatar_system.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20240128_media_uploads.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20240128_email_campaigns.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260118_message_board.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260118_community_events.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260118_community_core.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260118_create_fishy_learning_tables.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260118_weather_alert_logs.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260118_weather_alert_cron.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_vessels.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_captain_applications.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_gps_live_tracking.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_scraper_core.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_stripe_payment_columns.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_gamification_tables.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_sms_reminder_system.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_sms_notifications_system.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_sms_campaign_system.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_social_shares_system.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_link_click_tracking.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_fish_recognition_corrections.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_fishing_license_system.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_monetization_system.sql"; Priority="HIGH"},
    @{App="gulfcoastcharters"; File="supabase/migrations/20260119_uscg_integration.sql"; Priority="HIGH"},
    @{App="petreunion"; File="supabase/zapier-pet-of-day-lost-pets.sql"; Priority="HIGH"},
    @{App="popthepopcorn"; File="supabase/schema.sql"; Priority="MEDIUM"},
    @{App="popthepopcorn"; File="supabase/rls-policies.sql"; Priority="MEDIUM"},
    @{App="prognostication"; File="migrations/create-sms-tables.sql"; Priority="MEDIUM"},
    @{App="wheretovacation"; File="supabase/migrations/20260118_create_all_tables.sql"; Priority="MEDIUM"},
    @{App="wheretovacation"; File="supabase/migrations/20260118_create_fishy_learning_tables.sql"; Priority="MEDIUM"},
    @{App="alpha-hunter"; File="database/migrations/001_bot_memory_tables.sql"; Priority="MEDIUM"},
    @{App="alpha-hunter"; File="database/migrations/002_bot_config_and_strategy_params.sql"; Priority="MEDIUM"}
)

foreach ($migration in $migrations) {
    $filePath = "apps\$($migration.App)\$($migration.File)"
    $exists = Test-Path $filePath
    $status = if ($exists) { "✅" } else { "❌ MISSING" }
    Write-Host "$status [$($migration.Priority)] $filePath" -ForegroundColor $(if ($exists) { "Green" } else { "Red" })
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IMPORTANT: Run these migrations manually in Supabase SQL Editor" -ForegroundColor Yellow
Write-Host "1. Go to Supabase Dashboard > SQL Editor" -ForegroundColor Yellow
Write-Host "2. Run each migration file in order" -ForegroundColor Yellow
Write-Host "3. Verify with VERIFY_ALL_MIGRATIONS.sql" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
