-- Database Indexes for Performance Optimization
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- PET REUNION INDEXES
-- ============================================

-- Lost pets indexes
CREATE INDEX IF NOT EXISTS idx_lost_pets_status_location 
  ON lost_pets(status, location_state, location_city, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lost_pets_pet_type_status 
  ON lost_pets(pet_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lost_pets_breed_status 
  ON lost_pets(breed, status) 
  WHERE breed IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lost_pets_created_at 
  ON lost_pets(created_at DESC);

-- Full-text search index for lost pets
CREATE INDEX IF NOT EXISTS idx_lost_pets_search 
  ON lost_pets USING gin(to_tsvector('english', 
    coalesce(pet_name, '') || ' ' || 
    coalesce(breed, '') || ' ' || 
    coalesce(description, '')
  ));

-- Found pets indexes
CREATE INDEX IF NOT EXISTS idx_found_pets_status_location 
  ON found_pets(status, location_state, location_city, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_found_pets_pet_type_status 
  ON found_pets(pet_type, status, created_at DESC);

-- Pet matches indexes
CREATE INDEX IF NOT EXISTS idx_pet_matches_score_status 
  ON pet_matches(match_score DESC, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pet_matches_lost_pet_id 
  ON pet_matches(lost_pet_id, status);

CREATE INDEX IF NOT EXISTS idx_pet_matches_found_pet_id 
  ON pet_matches(found_pet_id, status);

-- Backup logs indexes
CREATE INDEX IF NOT EXISTS idx_backup_logs_timestamp 
  ON backup_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_backup_logs_status 
  ON backup_logs(status, timestamp DESC);

-- ============================================
-- GULF COAST CHARTERS / WTV INDEXES
-- ============================================

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id_status 
  ON bookings(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_captain_id_status 
  ON bookings(captain_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_date_range 
  ON bookings(booking_date, status) 
  WHERE booking_date >= CURRENT_DATE;

-- Vessels indexes
CREATE INDEX IF NOT EXISTS idx_vessels_captain_id_status 
  ON vessels(captain_id, status);

CREATE INDEX IF NOT EXISTS idx_vessels_location 
  ON vessels(location_city, location_state);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_vessel_id_rating 
  ON reviews(vessel_id, rating DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id 
  ON reviews(user_id, created_at DESC);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_type 
  ON profiles(user_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_email 
  ON profiles(email) 
  WHERE email IS NOT NULL;

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- Lost pets by location and type
CREATE INDEX IF NOT EXISTS idx_lost_pets_location_type_status 
  ON lost_pets(location_state, location_city, pet_type, status, created_at DESC);

-- Active matches
CREATE INDEX IF NOT EXISTS idx_pet_matches_active 
  ON pet_matches(status, match_score DESC) 
  WHERE status IN ('pending', 'reviewing');

-- Recent bookings
CREATE INDEX IF NOT EXISTS idx_bookings_recent 
  ON bookings(created_at DESC, status) 
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- ============================================
-- PERFORMANCE MONITORING
-- ============================================

-- Analyze tables after creating indexes
ANALYZE lost_pets;
ANALYZE found_pets;
ANALYZE pet_matches;
ANALYZE bookings;
ANALYZE vessels;
ANALYZE reviews;
ANALYZE profiles;

-- ============================================
-- NOTES
-- ============================================
-- 1. Indexes improve read performance but slightly slow down writes
-- 2. Monitor index usage with: SELECT * FROM pg_stat_user_indexes;
-- 3. Remove unused indexes to improve write performance
-- 4. Full-text search indexes require maintenance: REINDEX INDEX idx_lost_pets_search;












