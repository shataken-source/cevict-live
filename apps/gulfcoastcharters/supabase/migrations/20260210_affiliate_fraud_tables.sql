-- Affiliate Fraud Detection & Prevention
-- Tables: fraud_alerts, referral_tracking, affiliate_disputes, fraud_rules

CREATE TABLE IF NOT EXISTS public.fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID,
  affiliate_name TEXT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  evidence JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'confirmed_fraud')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

CREATE TABLE IF NOT EXISTS public.referral_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL,
  referred_user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  conversion_value DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID,
  affiliate_name TEXT,
  dispute_type TEXT NOT NULL,
  description TEXT,
  evidence JSONB DEFAULT '[]',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'rejected')),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

CREATE TABLE IF NOT EXISTS public.fraud_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  threshold_value DECIMAL(10,2),
  action TEXT NOT NULL CHECK (action IN ('flag', 'block', 'review')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_affiliate ON public.fraud_alerts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON public.fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_created ON public.fraud_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_affiliate ON public.referral_tracking(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_ip ON public.referral_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_created ON public.referral_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_disputes_status ON public.affiliate_disputes(status);

ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read fraud_alerts" ON public.fraud_alerts;
CREATE POLICY "Allow read fraud_alerts" ON public.fraud_alerts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert fraud_alerts" ON public.fraud_alerts;
CREATE POLICY "Allow insert fraud_alerts" ON public.fraud_alerts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update fraud_alerts" ON public.fraud_alerts;
CREATE POLICY "Allow update fraud_alerts" ON public.fraud_alerts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow read referral_tracking" ON public.referral_tracking;
CREATE POLICY "Allow read referral_tracking" ON public.referral_tracking FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert referral_tracking" ON public.referral_tracking;
CREATE POLICY "Allow insert referral_tracking" ON public.referral_tracking FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read affiliate_disputes" ON public.affiliate_disputes;
CREATE POLICY "Allow read affiliate_disputes" ON public.affiliate_disputes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert affiliate_disputes" ON public.affiliate_disputes;
CREATE POLICY "Allow insert affiliate_disputes" ON public.affiliate_disputes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update affiliate_disputes" ON public.affiliate_disputes;
CREATE POLICY "Allow update affiliate_disputes" ON public.affiliate_disputes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow read fraud_rules" ON public.fraud_rules;
CREATE POLICY "Allow read fraud_rules" ON public.fraud_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all fraud_rules admin" ON public.fraud_rules;
CREATE POLICY "Allow all fraud_rules admin" ON public.fraud_rules FOR ALL USING (true);

-- Stats for Fraud Dashboard (total_alerts, critical_alerts, resolved_today, fraud_prevented)
CREATE OR REPLACE FUNCTION public.get_fraud_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_alerts INT;
  critical_alerts INT;
  resolved_today INT;
  fraud_prevented NUMERIC;
BEGIN
  SELECT COUNT(*)::INT INTO total_alerts FROM fraud_alerts;
  SELECT COUNT(*)::INT INTO critical_alerts FROM fraud_alerts WHERE severity = 'critical';
  SELECT COUNT(*)::INT INTO resolved_today FROM fraud_alerts
    WHERE status IN ('resolved', 'confirmed_fraud') AND resolved_at >= date_trunc('day', now());
  SELECT COALESCE(SUM((evidence->>'estimated_amount')::numeric), 0) INTO fraud_prevented
    FROM fraud_alerts WHERE status = 'confirmed_fraud';
  RETURN json_build_object(
    'total_alerts', total_alerts,
    'critical_alerts', critical_alerts,
    'resolved_today', resolved_today,
    'fraud_prevented', COALESCE(fraud_prevented, 0)
  );
END;
$$;
