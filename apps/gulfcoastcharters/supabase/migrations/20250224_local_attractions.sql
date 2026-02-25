-- Local Attractions system
-- Auto-populated when new charter boats / WTV destinations are added
-- Supports future referral fee monetization

CREATE TABLE IF NOT EXISTS local_attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location grouping (normalized city name, e.g. "Gulf Shores, AL")
  location TEXT NOT NULL,
  region TEXT,                          -- "Gulf Coast", "Florida Panhandle", etc.

  -- Attraction details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'entertainment',
    -- museum, park, restaurant, shopping, entertainment, marine, sports, nightlife, tour, spa
  type TEXT NOT NULL DEFAULT 'both',
    -- indoor, outdoor, both
  price_range TEXT,                     -- 'Free', '$', '$$', '$$$', '$$$$'
  duration TEXT,                        -- '1-2 hours', 'Full day', etc.

  -- Contact / web
  website TEXT,
  phone TEXT,
  address TEXT,

  -- Geo
  lat DECIMAL(10, 8),
  lon DECIMAL(11, 8),

  -- Media
  image_url TEXT,
  photos TEXT[] DEFAULT '{}',

  -- Ratings
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  google_place_id TEXT,                 -- for syncing reviews / hours

  -- Referral monetization (future)
  referral_fee_percent DECIMAL(5, 2) DEFAULT 0,  -- e.g. 10.00 = 10%
  referral_url TEXT,                    -- affiliate / tracking link
  referral_active BOOLEAN DEFAULT false,
  referral_clicks INTEGER DEFAULT 0,
  referral_revenue DECIMAL(10, 2) DEFAULT 0,

  -- Source tracking
  source TEXT DEFAULT 'seed',           -- 'seed', 'google_places', 'manual', 'scraper', 'wtv_sync'
  source_boat_id UUID,                  -- scraped_boats.id that triggered discovery
  source_destination_id UUID,           -- wtv vacation_destinations.id

  -- Status
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,       -- manually verified by admin

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attractions_location ON local_attractions(location);
CREATE INDEX IF NOT EXISTS idx_attractions_category ON local_attractions(category);
CREATE INDEX IF NOT EXISTS idx_attractions_type ON local_attractions(type);
CREATE INDEX IF NOT EXISTS idx_attractions_active ON local_attractions(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_attractions_source_boat ON local_attractions(source_boat_id);
CREATE INDEX IF NOT EXISTS idx_attractions_google_place ON local_attractions(google_place_id);
CREATE INDEX IF NOT EXISTS idx_attractions_referral ON local_attractions(referral_active) WHERE referral_active = true;

-- Unique constraint: don't duplicate same attraction at same location
CREATE UNIQUE INDEX IF NOT EXISTS idx_attractions_name_location
  ON local_attractions(lower(name), lower(location));
