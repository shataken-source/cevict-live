-- ═══════════════════════════════════════════════════════════════════════════
-- REUNIONREADY PET VAULT SYSTEM
-- Premium feature: Pre-register pets for instant lost pet activation
-- $9.99/year subscription
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create pet_vault table (separate from lost_pets - stores healthy pets)
CREATE TABLE IF NOT EXISTS pet_vault (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Pet Information
  pet_name TEXT NOT NULL,
  pet_type TEXT NOT NULL, -- 'dog', 'cat', 'bird', etc.
  breed TEXT,
  color TEXT,
  size TEXT, -- 'small', 'medium', 'large'
  weight_lbs DECIMAL(5,2),
  age_years INTEGER,
  gender TEXT, -- 'male', 'female', 'unknown'
  
  -- Identification
  microchip_id TEXT,
  microchip_company TEXT,
  license_number TEXT,
  tattoo_info TEXT,
  
  -- Medical Information
  medical_conditions TEXT[],
  medications TEXT[],
  allergies TEXT[],
  special_needs TEXT,
  vet_name TEXT,
  vet_phone TEXT,
  
  -- Temperament & Behavior
  temperament TEXT, -- 'friendly', 'shy', 'aggressive', etc.
  good_with_kids BOOLEAN DEFAULT TRUE,
  good_with_pets BOOLEAN DEFAULT TRUE,
  escape_tendency TEXT, -- 'low', 'medium', 'high'
  known_triggers TEXT[],
  approach_instructions TEXT,
  
  -- Photos (multiple)
  primary_photo_url TEXT,
  additional_photos TEXT[], -- Array of URLs
  
  -- Location (home address for radius search)
  home_address TEXT,
  home_city TEXT,
  home_state TEXT,
  home_zip TEXT,
  home_lat DECIMAL(10, 8),
  home_lon DECIMAL(11, 8),
  
  -- Owner Contact
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  owner_phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- ReunionReady Subscription
  is_reunion_ready BOOLEAN DEFAULT FALSE,
  subscription_status TEXT DEFAULT 'inactive', -- 'active', 'inactive', 'cancelled', 'past_due'
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  subscription_cancelled_at TIMESTAMPTZ,
  
  -- Activation Status
  is_currently_lost BOOLEAN DEFAULT FALSE,
  lost_pet_id INTEGER REFERENCES lost_pets(id) ON DELETE SET NULL,
  last_activated_at TIMESTAMPTZ,
  activation_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_pet_vault_user ON pet_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_vault_subscription ON pet_vault(subscription_status) WHERE is_reunion_ready = TRUE;
CREATE INDEX IF NOT EXISTS idx_pet_vault_location ON pet_vault(home_lat, home_lon) WHERE home_lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pet_vault_lost ON pet_vault(is_currently_lost) WHERE is_currently_lost = TRUE;

-- 3. Create subscription_history table for audit
CREATE TABLE IF NOT EXISTS reunion_ready_subscriptions (
  id SERIAL PRIMARY KEY,
  vault_pet_id INTEGER NOT NULL REFERENCES pet_vault(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Stripe Info
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Subscription Details
  plan_type TEXT DEFAULT 'yearly', -- 'yearly', 'monthly' (future)
  amount_cents INTEGER NOT NULL, -- 999 = $9.99
  currency TEXT DEFAULT 'usd',
  
  -- Status
  status TEXT NOT NULL, -- 'active', 'past_due', 'cancelled', 'expired'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create activation_history table for tracking "Instant Alert" triggers
CREATE TABLE IF NOT EXISTS reunion_ready_activations (
  id SERIAL PRIMARY KEY,
  vault_pet_id INTEGER NOT NULL REFERENCES pet_vault(id) ON DELETE CASCADE,
  lost_pet_id INTEGER REFERENCES lost_pets(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  
  -- Activation Details
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  
  -- What was triggered
  qr_poster_generated BOOLEAN DEFAULT FALSE,
  camera_watch_notified INTEGER DEFAULT 0,
  sms_alerts_sent INTEGER DEFAULT 0,
  email_alerts_sent INTEGER DEFAULT 0,
  
  -- Resolution
  resolution_status TEXT, -- 'found_safe', 'found_injured', 'not_found', 'false_alarm'
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- 5. Create indexes for history tables
CREATE INDEX IF NOT EXISTS idx_subscriptions_vault ON reunion_ready_subscriptions(vault_pet_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON reunion_ready_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_activations_vault ON reunion_ready_activations(vault_pet_id);
CREATE INDEX IF NOT EXISTS idx_activations_date ON reunion_ready_activations(activated_at DESC);

-- 6. Function to check subscription validity
CREATE OR REPLACE FUNCTION check_subscription_valid(vault_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  vault_record RECORD;
BEGIN
  SELECT subscription_status, subscription_expires_at, is_reunion_ready
  INTO vault_record
  FROM pet_vault
  WHERE id = vault_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Must be reunion ready AND active subscription AND not expired
  RETURN vault_record.is_reunion_ready = TRUE 
    AND vault_record.subscription_status = 'active'
    AND (vault_record.subscription_expires_at IS NULL OR vault_record.subscription_expires_at > NOW());
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_pet_vault_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pet_vault_updated_at
  BEFORE UPDATE ON pet_vault
  FOR EACH ROW
  EXECUTE FUNCTION update_pet_vault_timestamp();

-- 8. Enable RLS
ALTER TABLE pet_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunion_ready_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunion_ready_activations ENABLE ROW LEVEL SECURITY;

-- 9. Policies for service role
CREATE POLICY "Service role full access to pet_vault"
  ON pet_vault FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to subscriptions"
  ON reunion_ready_subscriptions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to activations"
  ON reunion_ready_activations FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- 10. Users can read/update their own vault pets
CREATE POLICY "Users can manage own vault pets"
  ON pet_vault FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

