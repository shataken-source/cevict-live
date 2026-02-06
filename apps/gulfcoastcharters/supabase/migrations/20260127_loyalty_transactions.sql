-- Loyalty Transactions Table
-- Unified loyalty points system across GCC and WTV platforms
-- Simple transaction log for points earning and redemption

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Transaction type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'loyalty_transaction_type_enum'
  ) THEN
    CREATE TYPE public.loyalty_transaction_type_enum AS ENUM (
      'earned',
      'redeemed',
      'expired',
      'adjusted',
      'bonus'
    );
  END IF;
END $$;

-- Source type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'loyalty_source_type_enum'
  ) THEN
    CREATE TYPE public.loyalty_source_type_enum AS ENUM (
      'booking',
      'review',
      'referral',
      'milestone',
      'package',
      'promotion',
      'manual'
    );
  END IF;
END $$;

-- Loyalty Transactions table
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References auth.users(id) via Supabase Auth
  
  -- Transaction details
  transaction_type loyalty_transaction_type_enum NOT NULL,
  points INTEGER NOT NULL, -- Can be negative for redemptions
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('gcc', 'wtv', 'both')),
  
  -- Source information
  source_type loyalty_source_type_enum NOT NULL,
  source_id UUID, -- References booking_id, review_id, etc.
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}', -- Additional context (booking amount, etc.)
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- For points that expire
  
  -- Status
  is_reversed BOOLEAN DEFAULT false,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON public.loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_platform ON public.loyalty_transactions(platform);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_source ON public.loyalty_transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON public.loyalty_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_expires_at ON public.loyalty_transactions(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own transactions
DROP POLICY IF EXISTS "Users can read own transactions" ON public.loyalty_transactions;
CREATE POLICY "Users can read own transactions"
  ON public.loyalty_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for API operations)
DROP POLICY IF EXISTS "Service role full access" ON public.loyalty_transactions;
CREATE POLICY "Service role full access"
  ON public.loyalty_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to get user's current points balance
CREATE OR REPLACE FUNCTION public.get_user_points_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  balance INTEGER;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO balance
  FROM public.loyalty_transactions
  WHERE user_id = p_user_id
    AND is_reversed = false
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN balance;
END;
$$;

-- Function to get user's points by platform
CREATE OR REPLACE FUNCTION public.get_user_points_by_platform(p_user_id UUID)
RETURNS TABLE (
  platform VARCHAR(20),
  total_points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lt.platform,
    COALESCE(SUM(lt.points), 0)::INTEGER as total_points
  FROM public.loyalty_transactions lt
  WHERE lt.user_id = p_user_id
    AND lt.is_reversed = false
    AND (lt.expires_at IS NULL OR lt.expires_at > NOW())
  GROUP BY lt.platform;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE public.loyalty_transactions IS 'Unified loyalty points transactions across GCC and WTV platforms';
COMMENT ON COLUMN public.loyalty_transactions.points IS 'Points amount (positive for earned, negative for redeemed)';
COMMENT ON COLUMN public.loyalty_transactions.platform IS 'Platform where points were earned/redeemed: gcc, wtv, or both';
COMMENT ON FUNCTION public.get_user_points_balance(UUID) IS 'Returns current points balance for a user (excluding expired and reversed)';
COMMENT ON FUNCTION public.get_user_points_by_platform(UUID) IS 'Returns points balance broken down by platform';
