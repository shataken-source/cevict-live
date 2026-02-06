-- Monetization System - Database Schema
-- Subscriptions, featured listings, commission tracking

-- Captain Subscriptions Table
CREATE TABLE IF NOT EXISTS public.captain_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'pro', 'elite')),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_captain_subscriptions_user_id ON public.captain_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_captain_subscriptions_status ON public.captain_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_captain_subscriptions_plan_type ON public.captain_subscriptions(plan_type);

-- Featured Listings Table
CREATE TABLE IF NOT EXISTS public.featured_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charter_id UUID REFERENCES public.charters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('featured-day', 'featured-week', 'featured-month')),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_featured_listings_charter_id ON public.featured_listings(charter_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_user_id ON public.featured_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_featured_listings_status ON public.featured_listings(status);
CREATE INDEX IF NOT EXISTS idx_featured_listings_expires_at ON public.featured_listings(expires_at);

-- Add commission tracking to bookings table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'commission_amount') THEN
    ALTER TABLE public.bookings ADD COLUMN commission_amount DECIMAL(10, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'service_fee') THEN
    ALTER TABLE public.bookings ADD COLUMN service_fee DECIMAL(10, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'captain_payout') THEN
    ALTER TABLE public.bookings ADD COLUMN captain_payout DECIMAL(10, 2);
  END IF;
END $$;

-- Monetization Settings Table (Admin configurable)
CREATE TABLE IF NOT EXISTS public.monetization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO public.monetization_settings (setting_key, setting_value, description)
VALUES
  ('platform_commission_rate', '0.12', 'Default platform commission rate (12%)'),
  ('service_fee_rate', '0.08', 'Default service fee rate (8%)'),
  ('pro_subscription_price', '49.00', 'Professional subscription monthly price'),
  ('elite_subscription_price', '149.00', 'Elite subscription monthly price'),
  ('featured_day_price', '19.00', '24-hour featured listing price'),
  ('featured_week_price', '79.00', 'Weekly featured listing price'),
  ('featured_month_price', '249.00', 'Monthly featured listing price')
ON CONFLICT (setting_key) DO NOTHING;

-- RLS Policies for captain_subscriptions
ALTER TABLE public.captain_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view own subscriptions
CREATE POLICY "Users view own subscriptions" ON public.captain_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all subscriptions
CREATE POLICY "Service role manages subscriptions" ON public.captain_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for featured_listings
ALTER TABLE public.featured_listings ENABLE ROW LEVEL SECURITY;

-- Users can view own featured listings
CREATE POLICY "Users view own featured listings" ON public.featured_listings
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all featured listings
CREATE POLICY "Service role manages featured listings" ON public.featured_listings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for monetization_settings
ALTER TABLE public.monetization_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view/edit settings
CREATE POLICY "Admins manage settings" ON public.monetization_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to get commission rate for captain
CREATE OR REPLACE FUNCTION public.get_captain_commission_rate(p_user_id UUID)
RETURNS DECIMAL(3, 2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan_type TEXT;
  v_commission_rate DECIMAL(3, 2);
BEGIN
  -- Get captain's active subscription
  SELECT plan_type INTO v_plan_type
  FROM public.captain_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Determine commission rate based on plan
  CASE v_plan_type
    WHEN 'elite' THEN
      v_commission_rate := 0.05; -- 5%
    WHEN 'pro' THEN
      v_commission_rate := 0.08; -- 8%
    ELSE
      v_commission_rate := 0.12; -- 12% (basic/default)
  END CASE;
  
  RETURN v_commission_rate;
END;
$$;

-- Function to calculate booking amounts
CREATE OR REPLACE FUNCTION public.calculate_booking_amounts(
  p_booking_amount DECIMAL(10, 2),
  p_captain_id UUID
)
RETURNS TABLE (
  commission_amount DECIMAL(10, 2),
  service_fee DECIMAL(10, 2),
  captain_payout DECIMAL(10, 2),
  customer_total DECIMAL(10, 2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_commission_rate DECIMAL(3, 2);
  v_service_fee_rate DECIMAL(3, 2);
  v_commission DECIMAL(10, 2);
  v_service_fee DECIMAL(10, 2);
BEGIN
  -- Get commission rate for captain
  SELECT get_captain_commission_rate(p_captain_id) INTO v_commission_rate;
  
  -- Get service fee rate from settings
  SELECT CAST(setting_value AS DECIMAL(3, 2)) INTO v_service_fee_rate
  FROM public.monetization_settings
  WHERE setting_key = 'service_fee_rate'
  LIMIT 1;
  
  -- Default to 0.08 if not found
  IF v_service_fee_rate IS NULL THEN
    v_service_fee_rate := 0.08;
  END IF;
  
  -- Calculate amounts
  v_commission := p_booking_amount * v_commission_rate;
  v_service_fee := p_booking_amount * v_service_fee_rate;
  
  RETURN QUERY SELECT
    v_commission,
    v_service_fee,
    p_booking_amount - v_commission,
    p_booking_amount + v_service_fee;
END;
$$;
