-- ═══════════════════════════════════════════════════════════════════════════
-- DONATIONS AND SPONSORSHIPS SYSTEM
-- Community Heroes program for Alabama businesses
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Sponsorship Inquiries (from footer form)
CREATE TABLE IF NOT EXISTS sponsorship_inquiries (
  id SERIAL PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL,
  state TEXT DEFAULT 'AL',
  message TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'contacted', 'active', 'declined'
  contacted_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Active Sponsors (Community Heroes)
CREATE TABLE IF NOT EXISTS sponsors (
  id SERIAL PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website_url TEXT,
  
  -- Location
  address TEXT,
  city TEXT NOT NULL,
  state TEXT DEFAULT 'AL',
  zip TEXT,
  
  -- Branding
  logo_url TEXT,
  description TEXT,
  
  -- Sponsorship Details
  tier TEXT DEFAULT 'supporter', -- 'supporter', 'bronze', 'silver', 'gold', 'platinum'
  monthly_amount DECIMAL(10,2),
  total_donated DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  since_date DATE DEFAULT CURRENT_DATE,
  expires_at DATE,
  
  -- Display
  show_on_website BOOLEAN DEFAULT TRUE,
  show_on_posters BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Donation Records (from GoFundMe or direct)
CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  donor_name TEXT,
  donor_email TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  
  -- Source
  source TEXT NOT NULL, -- 'gofundme', 'stripe', 'paypal', 'cash', 'check'
  source_transaction_id TEXT,
  
  -- Attribution
  attributed_to_pet_id INTEGER REFERENCES lost_pets(id) ON DELETE SET NULL,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  
  -- Status
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'refunded'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_sponsorship_inquiries_status ON sponsorship_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_sponsors_active ON sponsors(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sponsors_tier ON sponsors(tier);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(created_at DESC);

-- 5. Enable RLS
ALTER TABLE sponsorship_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- 6. Policies for service role
CREATE POLICY "Service role full access to sponsorship_inquiries"
  ON sponsorship_inquiries FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to sponsors"
  ON sponsors FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to donations"
  ON donations FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- 7. Public read access for sponsors (for Community Heroes page)
CREATE POLICY "Public can view active sponsors"
  ON sponsors FOR SELECT TO anon
  USING (is_active = TRUE AND show_on_website = TRUE);

