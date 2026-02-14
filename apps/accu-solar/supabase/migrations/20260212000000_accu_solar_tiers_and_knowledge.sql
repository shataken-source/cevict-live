-- Accu-Solar cevict.ai: tiers, sites, telemetry history, alerts, usage, solar AI knowledge
-- Run in Accu-Solar Supabase project. Cochran can run this (see COCHRAN_TASKS.json).

-- ============================================
-- 1. Subscriptions (tier per user)
-- ============================================
CREATE TABLE IF NOT EXISTS public.accu_solar_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'professional')),
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accu_solar_subscriptions_user
  ON public.accu_solar_subscriptions(user_id);

-- ============================================
-- 2. Sites (multi-location: Basic 1, Pro N)
-- ============================================
CREATE TABLE IF NOT EXISTS public.accu_solar_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accu_solar_sites_user
  ON public.accu_solar_sites(user_id);

-- ============================================
-- 3. Telemetry history (Pro 90d, Basic 7d retention)
-- ============================================
CREATE TABLE IF NOT EXISTS public.accu_solar_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.accu_solar_sites(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL,
  battery_soc_pct NUMERIC,
  battery_v NUMERIC,
  battery_a NUMERIC,
  battery_temp_c NUMERIC,
  solar_w NUMERIC,
  load_w NUMERIC,
  grid_w NUMERIC,
  source TEXT CHECK (source IN ('ble', 'victron', 'demo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accu_solar_telemetry_site_ts
  ON public.accu_solar_telemetry(site_id, ts DESC);

-- ============================================
-- 4. Alerts (Pro)
-- ============================================
CREATE TABLE IF NOT EXISTS public.accu_solar_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  site_id UUID REFERENCES public.accu_solar_sites(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  rule_params JSONB NOT NULL DEFAULT '{}',
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push')),
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accu_solar_alerts_user
  ON public.accu_solar_alerts(user_id);

-- ============================================
-- 5. Usage (rate limits: AI requests, exports)
-- ============================================
CREATE TABLE IF NOT EXISTS public.accu_solar_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,
  ai_requests INTEGER NOT NULL DEFAULT 0,
  exports_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_accu_solar_usage_user_month
  ON public.accu_solar_usage(user_id, month);

-- ============================================
-- 6. Solar AI knowledge (Fishy-style, solar-only)
-- ============================================
CREATE TABLE IF NOT EXISTS public.accu_solar_ai_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  keywords TEXT[],
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accu_solar_ai_knowledge_category
  ON public.accu_solar_ai_knowledge(category);

CREATE INDEX IF NOT EXISTS idx_accu_solar_ai_knowledge_keywords
  ON public.accu_solar_ai_knowledge USING GIN (keywords);

COMMENT ON TABLE public.accu_solar_ai_knowledge IS 'Solar-only knowledge for dedicated Copilot: safety, sizing, formulas. Retrieve by keyword/category and inject into system prompt (Fishy-style).';

-- Seed solar knowledge (only when table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.accu_solar_ai_knowledge LIMIT 1) THEN
    INSERT INTO public.accu_solar_ai_knowledge (topic, content, category, keywords)
    VALUES
      ('String voltage safety', 'Never exceed inverter or charge controller max DC input voltage (Voc). For 150V max controller, stay under ~140V at coldest temp; Voc rises as temp drops. Leave margin.', 'safety', ARRAY['voltage', 'voc', 'string', 'safety', 'controller']),
      ('LiFePO4 SoC and longevity', 'Keeping LiFePO4 between 20% and 90% daily extends cycle life. Avoid 100% float for long periods. 0% is damaging.', 'battery', ARRAY['lifepo4', 'soc', 'cycle', 'longevity', 'battery']),
      ('Charge rate (C-rate)', 'Many LiFePO4 BMS allow 0.5C–1C charge. For 280Ah pack, 1C = 280A. Typical solar charge is well under 1C.', 'battery', ARRAY['c-rate', 'charge', 'bms', 'current']),
      ('Panel string sizing', 'String voltage = sum of panel Voc in series. String current = single panel Isc (series) or sum of Isc (parallel). Match to controller MPPT range.', 'sizing', ARRAY['string', 'voc', 'isc', 'mppt', 'panel']);
  END IF;
END $$;
