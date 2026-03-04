-- =============================================================================
-- Supabase Database Linter Fix Script
-- Fixes: SECURITY DEFINER views, RLS disabled tables, sensitive columns exposed
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =============================================================================

-- ─── 1. FIX SECURITY DEFINER VIEWS ──────────────────────────────────────────
-- Change from SECURITY DEFINER to SECURITY INVOKER so RLS is respected.
-- We need to recreate each view. First get their definitions, then recreate.

-- 1a. last_pets_found
ALTER VIEW public.last_pets_found SET (security_invoker = on);

-- 1b. portfolio_summary
ALTER VIEW public.portfolio_summary SET (security_invoker = on);

-- 1c. empire_stores_view
ALTER VIEW public.empire_stores_view SET (security_invoker = on);

-- 1d. open_positions
ALTER VIEW public.open_positions SET (security_invoker = on);

-- 1e. vw_kalshi_open_positions
ALTER VIEW public.vw_kalshi_open_positions SET (security_invoker = on);

-- 1f. active_backtest_api_keys
ALTER VIEW public.active_backtest_api_keys SET (security_invoker = on);

-- 1g. trade_performance
ALTER VIEW public.trade_performance SET (security_invoker = on);


-- ─── 2. ENABLE RLS ON ALL PUBLIC TABLES ─────────────────────────────────────
-- Enable RLS + add a permissive policy for service_role (so backend still works)
-- Anonymous/public access is blocked by default once RLS is on.

-- TrailerVegas tables
ALTER TABLE public.trailervegas_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trailervegas_reports ENABLE ROW LEVEL SECURITY;

-- Lost pets
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;

-- Progno / Alpha Hunter tables
ALTER TABLE public.my_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kalshi_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuning_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharp_money_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odds_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_odds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syndicated_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syndication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actual_bets ENABLE ROW LEVEL SECURITY;

-- Notification tables
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- Fishy / GulfCoast tables
ALTER TABLE public.fishy_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fishy_learning_patterns ENABLE ROW LEVEL SECURITY;

-- WhereToVacation / travel tables
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_nearby_attractions ENABLE ROW LEVEL SECURITY;

-- Misc tables
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_test_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_alert_logs ENABLE ROW LEVEL SECURITY;

-- AccuSolar tables
ALTER TABLE public.accu_solar_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accu_solar_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accu_solar_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accu_solar_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accu_solar_usage ENABLE ROW LEVEL SECURITY;

-- spatial_ref_sys (PostGIS system table — enable RLS but allow all reads)
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;


-- ─── 3. ADD SERVICE ROLE POLICIES ───────────────────────────────────────────
-- service_role bypasses RLS by default in Supabase, but we add explicit
-- policies for anon/authenticated where needed.

-- Helper: Create a "service_role full access" policy template for all tables.
-- service_role already bypasses RLS in Supabase, so we just need to make sure
-- tables that need public READ access get an anon policy.

-- spatial_ref_sys: PostGIS needs public read
CREATE POLICY "spatial_ref_sys_public_read" ON public.spatial_ref_sys
  FOR SELECT USING (true);

-- Tables that need anon read access (public-facing data):
-- destination_content, local_attractions, listing_nearby_attractions, rental_availability
CREATE POLICY "destination_content_public_read" ON public.destination_content
  FOR SELECT USING (true);
CREATE POLICY "local_attractions_public_read" ON public.local_attractions
  FOR SELECT USING (true);
CREATE POLICY "listing_nearby_attractions_public_read" ON public.listing_nearby_attractions
  FOR SELECT USING (true);
CREATE POLICY "rental_availability_public_read" ON public.rental_availability
  FOR SELECT USING (true);

-- Progno public-facing read-only tables:
CREATE POLICY "odds_cache_public_read" ON public.odds_cache
  FOR SELECT USING (true);
CREATE POLICY "syndicated_picks_public_read" ON public.syndicated_picks
  FOR SELECT USING (true);
CREATE POLICY "actual_bets_public_read" ON public.actual_bets
  FOR SELECT USING (true);
CREATE POLICY "my_picks_public_read" ON public.my_picks
  FOR SELECT USING (true);
CREATE POLICY "historical_odds_public_read" ON public.historical_odds
  FOR SELECT USING (true);
CREATE POLICY "calibration_history_public_read" ON public.calibration_history
  FOR SELECT USING (true);
CREATE POLICY "sharp_money_alerts_public_read" ON public.sharp_money_alerts
  FOR SELECT USING (true);

-- TrailerVegas needs anon read for public pages
CREATE POLICY "trailervegas_pending_public_read" ON public.trailervegas_pending
  FOR SELECT USING (true);
CREATE POLICY "trailervegas_reports_public_read" ON public.trailervegas_reports
  FOR SELECT USING (true);

-- Lost pets needs public read
CREATE POLICY "lost_pets_public_read" ON public.lost_pets
  FOR SELECT USING (true);

-- Notification tables — only service_role (no anon policy needed)
-- notification_templates, notifications_queue, notification_events
-- (service_role bypasses RLS automatically)

-- Internal tables — no anon access needed:
-- kalshi_learning_data, tuning_config, backtest_api_keys, capital_ledger,
-- syndication_log, fishy_*, agent_test_events, weather_alert_logs,
-- accu_solar_*, user_events, saved_searches, search_alerts


-- ─── 4. DONE ────────────────────────────────────────────────────────────────
-- After running this script, re-run the Supabase linter to verify all
-- SECURITY DEFINER, RLS disabled, and sensitive columns issues are resolved.
