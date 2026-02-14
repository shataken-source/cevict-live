-- =============================================
-- MULTI-DAY TRIP PLANNER TABLES
-- =============================================

-- Main trips table
CREATE TABLE IF NOT EXISTS multi_day_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip accommodations
CREATE TABLE IF NOT EXISTS trip_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES multi_day_trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  cost DECIMAL(10,2),
  booking_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip fishing spots
CREATE TABLE IF NOT EXISTS trip_fishing_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES multi_day_trips(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  name TEXT NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  target_species TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip packing lists
CREATE TABLE IF NOT EXISTS trip_packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES multi_day_trips(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INT DEFAULT 1,
  is_packed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip companions
CREATE TABLE IF NOT EXISTS trip_companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES multi_day_trips(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'pending',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- Trip itinerary items
CREATE TABLE IF NOT EXISTS trip_itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES multi_day_trips(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  time TIME,
  activity TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE multi_day_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_fishing_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_itinerary_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for multi_day_trips
CREATE POLICY "Users view own trips" ON multi_day_trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own trips" ON multi_day_trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own trips" ON multi_day_trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own trips" ON multi_day_trips
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "View shared trips" ON multi_day_trips
  FOR SELECT USING (share_token IS NOT NULL);

-- RLS Policies for trip_accommodations
CREATE POLICY "View accommodations for own trips" ON trip_accommodations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

CREATE POLICY "Manage accommodations for own trips" ON trip_accommodations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

-- RLS Policies for trip_fishing_spots
CREATE POLICY "View spots for own trips" ON trip_fishing_spots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

CREATE POLICY "Manage spots for own trips" ON trip_fishing_spots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

-- RLS Policies for trip_packing_lists
CREATE POLICY "View packing for own trips" ON trip_packing_lists
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

CREATE POLICY "Manage packing for own trips" ON trip_packing_lists
  FOR ALL USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

-- RLS Policies for trip_companions
CREATE POLICY "View companions for own trips" ON trip_companions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

CREATE POLICY "Manage companions for own trips" ON trip_companions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

-- RLS Policies for trip_itinerary_items
CREATE POLICY "View itinerary for own trips" ON trip_itinerary_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

CREATE POLICY "Manage itinerary for own trips" ON trip_itinerary_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM multi_day_trips WHERE id = trip_id AND user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_trips_user ON multi_day_trips(user_id);
CREATE INDEX idx_trips_dates ON multi_day_trips(start_date, end_date);
CREATE INDEX idx_accommodations_trip ON trip_accommodations(trip_id);
CREATE INDEX idx_spots_trip ON trip_fishing_spots(trip_id);
CREATE INDEX idx_packing_trip ON trip_packing_lists(trip_id);
CREATE INDEX idx_companions_trip ON trip_companions(trip_id);
CREATE INDEX idx_itinerary_trip ON trip_itinerary_items(trip_id);
