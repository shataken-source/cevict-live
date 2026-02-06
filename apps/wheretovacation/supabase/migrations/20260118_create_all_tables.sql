-- WhereToVacation - Complete Database Schema
-- Creates all required tables for the vacation planning platform

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- destinations table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  region VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(50) DEFAULT 'USA',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  attractions TEXT[],
  highlights TEXT[],
  best_time_to_visit TEXT,
  available_activities JSONB DEFAULT '[]',
  photos TEXT[] DEFAULT '{}',
  primary_photo TEXT,
  video_url TEXT,
  popularity_score INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2),
  total_reviews INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destinations_active ON destinations(active);
CREATE INDEX IF NOT EXISTS idx_destinations_featured ON destinations(featured);
CREATE INDEX IF NOT EXISTS idx_destinations_name ON destinations(name);

-- ============================================
-- accommodations table (vacation rentals)
-- ============================================
CREATE TABLE IF NOT EXISTS accommodations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
  
  -- Basic Info
  name TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'vacation_rental' CHECK (type IN ('hotel', 'vacation_rental', 'condo', 'resort', 'campground')),
  
  -- Details
  description TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  max_guests INTEGER,
  
  -- Amenities
  amenities JSONB DEFAULT '[]',
  
  -- Pricing
  nightly_rate DECIMAL(10, 2),
  weekly_rate DECIMAL(10, 2),
  cleaning_fee DECIMAL(10, 2) DEFAULT 0,
  
  -- Location
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_to_beach_miles DECIMAL(4, 2),
  distance_to_marina_miles DECIMAL(4, 2),
  
  -- Photos
  photos TEXT[] DEFAULT '{}',
  primary_photo TEXT,
  
  -- Availability
  available_for_booking BOOLEAN DEFAULT true,
  min_stay_nights INTEGER DEFAULT 1,
  
  -- Status
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accommodations_destination ON accommodations(destination_id);
CREATE INDEX IF NOT EXISTS idx_accommodations_type ON accommodations(type);
CREATE INDEX IF NOT EXISTS idx_accommodations_available ON accommodations(available_for_booking);
CREATE INDEX IF NOT EXISTS idx_accommodations_active ON accommodations(active);

-- ============================================
-- bookings table
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- References auth.users(id) via Supabase Auth
  rental_id UUID REFERENCES accommodations(id) ON DELETE SET NULL,
  package_id UUID, -- References vacation_packages(id) if booking a package
  
  -- Booking Details
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL,
  guests INTEGER,
  
  -- Pricing
  nightly_rate DECIMAL(10, 2),
  subtotal DECIMAL(10, 2),
  cleaning_fee DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  
  -- Payment
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  
  -- Metadata
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  special_requests TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_rental ON bookings(rental_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out ON bookings(check_out);

-- ============================================
-- vacation_packages table
-- ============================================
CREATE TABLE IF NOT EXISTS vacation_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- References auth.users(id) via Supabase Auth
  name TEXT NOT NULL,
  description TEXT,
  
  -- Package Items (JSONB for flexibility)
  items JSONB NOT NULL DEFAULT '[]',
  -- Format: [{"id": "...", "type": "rental|boat|activity", "name": "...", "price": 200, ...}]
  
  -- Pricing
  subtotal DECIMAL(10, 2),
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'saved', 'booked', 'cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vacation_packages_user ON vacation_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_vacation_packages_status ON vacation_packages(status);

-- ============================================
-- attractions table (optional - for destination guides)
-- ============================================
CREATE TABLE IF NOT EXISTS attractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  category VARCHAR(50) CHECK (category IN ('restaurant', 'museum', 'park', 'beach', 'shopping', 'nightlife', 'activity')),
  description TEXT,
  
  -- Location
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Details
  price_range VARCHAR(20) CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
  hours_of_operation JSONB,
  website TEXT,
  phone TEXT,
  
  photos TEXT[] DEFAULT '{}',
  rating DECIMAL(3, 2),
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attractions_destination ON attractions(destination_id);
CREATE INDEX IF NOT EXISTS idx_attractions_category ON attractions(category);
CREATE INDEX IF NOT EXISTS idx_attractions_active ON attractions(active);

-- ============================================
-- Update triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
DROP TRIGGER IF EXISTS trg_destinations_updated_at ON destinations;
CREATE TRIGGER trg_destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_accommodations_updated_at ON accommodations;
CREATE TRIGGER trg_accommodations_updated_at
  BEFORE UPDATE ON accommodations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_vacation_packages_updated_at ON vacation_packages;
CREATE TRIGGER trg_vacation_packages_updated_at
  BEFORE UPDATE ON vacation_packages
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================
-- Disable RLS for API Access (Development)
-- ============================================
-- Disable RLS on all tables to allow service role key access
-- (Can enable later with proper policies if needed)

ALTER TABLE destinations DISABLE ROW LEVEL SECURITY;
ALTER TABLE accommodations DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_packages DISABLE ROW LEVEL SECURITY;
ALTER TABLE attractions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE destinations IS 'Vacation destinations with guides and information';
COMMENT ON TABLE accommodations IS 'Vacation rentals, hotels, condos available for booking';
COMMENT ON TABLE bookings IS 'User bookings for accommodations and packages';
COMMENT ON TABLE vacation_packages IS 'Custom vacation packages combining rentals, boats, and activities';
COMMENT ON TABLE attractions IS 'Attractions, restaurants, and activities at destinations';
