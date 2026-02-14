-- Smart Vacation Package Builder: GCC + WTV integration
-- When user books charter, suggest rentals. When booking rental, suggest charters.
-- 15% package discount when both booked together.

CREATE TABLE IF NOT EXISTS vacation_packages (
  id BIGSERIAL PRIMARY KEY,
  package_name TEXT NOT NULL,
  description TEXT,
  
  -- Components
  gcc_charter_id BIGINT, -- Reference to GCC charter booking
  wtv_rental_id BIGINT,  -- Reference to WTV rental booking
  
  -- Pricing
  charter_price DECIMAL(10,2),
  rental_price DECIMAL(10,2),
  total_before_discount DECIMAL(10,2),
  discount_percent DECIMAL(5,2) DEFAULT 15.00,
  discount_amount DECIMAL(10,2),
  final_price DECIMAL(10,2),
  
  -- Customer
  customer_id UUID NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  
  -- Weather-based recommendations
  recommended_fishing_days DATE[], -- Best fishing days during rental stay
  weather_forecast JSONB, -- Stored weather for trip dates
  
  -- Metadata
  created_by TEXT, -- 'finn', 'customer', 'admin'
  special_requests TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_recommendations (
  id BIGSERIAL PRIMARY KEY,
  
  -- Trigger
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('charter_booked', 'rental_booked')),
  trigger_id BIGINT NOT NULL, -- ID of charter or rental that triggered this
  customer_id UUID NOT NULL,
  
  -- Recommendation
  recommended_type TEXT NOT NULL CHECK (recommended_type IN ('charter', 'rental')),
  recommended_dates DATE[],
  
  -- Matching logic
  match_reason TEXT, -- 'same_location', 'weather_optimal', 'overlapping_dates', etc.
  weather_score DECIMAL(4,2), -- 0-100, how good is weather for fishing
  availability_score DECIMAL(4,2), -- 0-100, how many options available
  
  -- Details
  suggested_charters JSONB, -- Array of charter options
  suggested_rentals JSONB,  -- Array of rental options
  discount_offered DECIMAL(5,2) DEFAULT 15.00,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'clicked', 'booked', 'dismissed')),
  viewed_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_weather_analysis (
  id BIGSERIAL PRIMARY KEY,
  location TEXT NOT NULL, -- 'Orange Beach, AL', etc.
  date DATE NOT NULL,
  
  -- Weather data
  temp_high DECIMAL(5,2),
  temp_low DECIMAL(5,2),
  wind_speed DECIMAL(5,2),
  wind_direction TEXT,
  wave_height DECIMAL(4,2),
  precipitation_chance DECIMAL(5,2),
  
  -- Fishing suitability
  fishing_score DECIMAL(4,2), -- 0-100
  fishing_rating TEXT CHECK (fishing_rating IN ('excellent', 'good', 'fair', 'poor', 'bad')),
  
  -- Recommendations
  is_recommended_fishing_day BOOLEAN DEFAULT FALSE,
  
  -- Source
  data_source TEXT DEFAULT 'NOAA',
  
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(location, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_packages_customer ON vacation_packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_packages_dates ON vacation_packages(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_packages_status ON vacation_packages(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_customer ON package_recommendations(customer_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON package_recommendations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weather_location_date ON package_weather_analysis(location, date DESC);
CREATE INDEX IF NOT EXISTS idx_weather_fishing_days ON package_weather_analysis(is_recommended_fishing_day) WHERE is_recommended_fishing_day = TRUE;

-- RLS
ALTER TABLE vacation_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_weather_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see own packages"
  ON vacation_packages FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers manage own packages"
  ON vacation_packages FOR ALL
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers see own recommendations"
  ON package_recommendations FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Anyone can read weather data"
  ON package_weather_analysis FOR SELECT
  USING (TRUE);

-- Service role full access
CREATE POLICY "Service role full access on packages"
  ON vacation_packages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on recommendations"
  ON package_recommendations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on weather"
  ON package_weather_analysis FOR ALL
  USING (auth.role() = 'service_role');

-- Function to calculate package discount
CREATE OR REPLACE FUNCTION calculate_package_discount(
  p_charter_price DECIMAL,
  p_rental_price DECIMAL
)
RETURNS TABLE(
  discount_percent DECIMAL,
  discount_amount DECIMAL,
  final_price DECIMAL
) AS $$
BEGIN
  RETURN QUERY SELECT
    15.00::DECIMAL as discount_percent,
    ((p_charter_price + p_rental_price) * 0.15)::DECIMAL as discount_amount,
    ((p_charter_price + p_rental_price) * 0.85)::DECIMAL as final_price;
END;
$$ LANGUAGE plpgsql;

-- Function to find best fishing days
CREATE OR REPLACE FUNCTION get_best_fishing_days(
  p_location TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  fishing_date DATE,
  fishing_score DECIMAL,
  fishing_rating TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date as fishing_date,
    fishing_score,
    fishing_rating
  FROM package_weather_analysis
  WHERE location = p_location
    AND date BETWEEN p_start_date AND p_end_date
    AND fishing_score >= 70
  ORDER BY fishing_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE vacation_packages IS 'Combined GCC charter + WTV rental packages with 15% discount.';
COMMENT ON TABLE package_recommendations IS 'Finn AI suggestions: book charter → suggest rental, or vice versa.';
COMMENT ON TABLE package_weather_analysis IS 'Weather data for fishing suitability scoring (feeds Finn recommendations).';
