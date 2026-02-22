-- Alpha Hunter core schema (accounts, trades, fund events)
-- Safe to run multiple times; uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS.

-- Enable pgcrypto for gen_random_uuid() if not already
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Accounts table -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alpha_hunter_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  balance NUMERIC(12,2) DEFAULT 0,
  available_funds NUMERIC(12,2) DEFAULT 0,
  total_profit NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Columns assurance
ALTER TABLE IF EXISTS public.alpha_hunter_accounts
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_funds NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_profit NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_aha_user ON public.alpha_hunter_accounts(user_id);

-- 2) Trades table -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alpha_hunter_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.alpha_hunter_accounts(id) ON DELETE SET NULL,
  market_id TEXT NOT NULL,
  market_ticker TEXT,
  title TEXT,
  side TEXT CHECK (side IN ('YES','NO')), -- Kalshi sides
  price_cents INTEGER,                    -- 1..99
  quantity INTEGER DEFAULT 1,
  stake_usd NUMERIC(12,2) DEFAULT 0,     -- stake in USD
  fees_usd NUMERIC(12,2) DEFAULT 0,
  pnl_usd NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'open',            -- open/closed/cancelled
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.alpha_hunter_trades
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.alpha_hunter_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS market_id TEXT,
  ADD COLUMN IF NOT EXISTS market_ticker TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS side TEXT,
  ADD COLUMN IF NOT EXISTS price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS stake_usd NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fees_usd NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pnl_usd NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_aht_account ON public.alpha_hunter_trades(account_id);
CREATE INDEX IF NOT EXISTS idx_aht_market ON public.alpha_hunter_trades(market_id);
CREATE INDEX IF NOT EXISTS idx_aht_status ON public.alpha_hunter_trades(status);
CREATE INDEX IF NOT EXISTS idx_aht_opened ON public.alpha_hunter_trades(opened_at);

-- 3) Fund events (deposits/withdrawals/fees/PnL adjustments) -----------------
CREATE TABLE IF NOT EXISTS public.alpha_hunter_fund_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.alpha_hunter_accounts(id) ON DELETE SET NULL,
  type TEXT NOT NULL,                    -- deposit, withdraw, pnl, fee, adjust
  amount_usd NUMERIC(12,2) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.alpha_hunter_fund_events
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.alpha_hunter_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_ahf_account ON public.alpha_hunter_fund_events(account_id);
CREATE INDEX IF NOT EXISTS idx_ahf_type ON public.alpha_hunter_fund_events(type);
CREATE INDEX IF NOT EXISTS idx_ahf_created ON public.alpha_hunter_fund_events(created_at);

-- 4) RLS policies -------------------------------------------------------------
ALTER TABLE public.alpha_hunter_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alpha_hunter_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alpha_hunter_fund_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alpha_hunter_accounts' AND policyname = 'service_all') THEN
    EXECUTE 'CREATE POLICY service_all ON public.alpha_hunter_accounts USING (auth.role() = ''service_role'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alpha_hunter_accounts' AND policyname = 'anon_read') THEN
    EXECUTE 'CREATE POLICY anon_read ON public.alpha_hunter_accounts FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alpha_hunter_trades' AND policyname = 'service_all') THEN
    EXECUTE 'CREATE POLICY service_all ON public.alpha_hunter_trades USING (auth.role() = ''service_role'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alpha_hunter_trades' AND policyname = 'anon_read') THEN
    EXECUTE 'CREATE POLICY anon_read ON public.alpha_hunter_trades FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alpha_hunter_fund_events' AND policyname = 'service_all') THEN
    EXECUTE 'CREATE POLICY service_all ON public.alpha_hunter_fund_events USING (auth.role() = ''service_role'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alpha_hunter_fund_events' AND policyname = 'anon_read') THEN
    EXECUTE 'CREATE POLICY anon_read ON public.alpha_hunter_fund_events FOR SELECT USING (true)';
  END IF;
END $$;

-- Done.
