-- ============================================================================
-- GULF COAST CHARTERS - DATABASE PERMISSIONS & ROW LEVEL SECURITY
-- ============================================================================
-- This script sets up proper Row Level Security (RLS) policies for all tables
-- Ensures users can only access their own data with appropriate exceptions
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE PERMISSIONS
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Public profiles (captains with public listings) are visible to all
CREATE POLICY "Public captain profiles are visible"
  ON users FOR SELECT
  USING (is_captain = true AND profile_visibility = 'public');

-- ============================================================================
-- 2. USER STATS PERMISSIONS
-- ============================================================================

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Users can view their own stats
CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert/update stats (service role only)
CREATE POLICY "Service role can manage all stats"
  ON user_stats FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Public leaderboard visibility (top 100)
CREATE POLICY "Public can view leaderboard stats"
  ON user_stats FOR SELECT
  USING (true); -- Will be filtered by application logic

-- ============================================================================
-- 3. POINTS TRANSACTIONS PERMISSIONS
-- ============================================================================

ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transaction history
CREATE POLICY "Users can view own points transactions"
  ON points_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert points
CREATE POLICY "Service role can insert points"
  ON points_transactions FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Prevent deletion/modification of point history
CREATE POLICY "No one can delete points transactions"
  ON points_transactions FOR DELETE
  USING (false);

CREATE POLICY "No one can update points transactions"
  ON points_transactions FOR UPDATE
  USING (false);

-- ============================================================================
-- 4. USER BADGES PERMISSIONS
-- ============================================================================

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Users can view their own badges
CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can view others' badges (public achievement)
CREATE POLICY "Badges are publicly visible"
  ON user_badges FOR SELECT
  USING (true);

-- Only service role can award badges
CREATE POLICY "Service role can award badges"
  ON user_badges FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- No one can delete badges
CREATE POLICY "Badges cannot be deleted"
  ON user_badges FOR DELETE
  USING (false);

-- ============================================================================
-- 5. DAILY CHECK-INS PERMISSIONS
-- ============================================================================

ALTER TABLE daily_check_ins ENABLE ROW LEVEL SECURITY;

-- Users can view their own check-ins
CREATE POLICY "Users can view own check-ins"
  ON daily_check_ins FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own check-ins (one per day enforced by UNIQUE constraint)
CREATE POLICY "Users can create own check-ins"
  ON daily_check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No modifications allowed
CREATE POLICY "Check-ins cannot be updated"
  ON daily_check_ins FOR UPDATE
  USING (false);

CREATE POLICY "Check-ins cannot be deleted"
  ON daily_check_ins FOR DELETE
  USING (false);

-- ============================================================================
-- 6. NOTIFICATIONS PERMISSIONS
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can create notifications
CREATE POLICY "Service role can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. NOTIFICATION LOG PERMISSIONS
-- ============================================================================

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own notification log
CREATE POLICY "Users can view own notification log"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert into log
CREATE POLICY "Service role can insert notification log"
  ON notification_log FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- No one can modify/delete logs (audit trail)
CREATE POLICY "Notification logs are immutable"
  ON notification_log FOR UPDATE
  USING (false);

CREATE POLICY "Notification logs cannot be deleted"
  ON notification_log FOR DELETE
  USING (false);

-- ============================================================================
-- 8. USER LOCATIONS PERMISSIONS
-- ============================================================================

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- Users can view their own location
CREATE POLICY "Users can view own location"
  ON user_locations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public locations
CREATE POLICY "Public locations are visible to all"
  ON user_locations FOR SELECT
  USING (sharing_mode = 'public');

-- Users can view friends' locations (requires friends table - placeholder)
CREATE POLICY "Users can view friends locations"
  ON user_locations FOR SELECT
  USING (
    sharing_mode = 'friends' 
    AND EXISTS (
      SELECT 1 FROM friendships 
      WHERE (user_id = auth.uid() AND friend_id = user_locations.user_id)
         OR (friend_id = auth.uid() AND user_id = user_locations.user_id)
      AND status = 'accepted'
    )
  );

-- Users can update their own location
CREATE POLICY "Users can update own location"
  ON user_locations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own location
CREATE POLICY "Users can insert own location"
  ON user_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own location
CREATE POLICY "Users can delete own location"
  ON user_locations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 9. PINNED LOCATIONS PERMISSIONS
-- ============================================================================

ALTER TABLE pinned_locations ENABLE ROW LEVEL SECURITY;

-- Users can view their own pins
CREATE POLICY "Users can view own pins"
  ON pinned_locations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public pins
CREATE POLICY "Public pins are visible to all"
  ON pinned_locations FOR SELECT
  USING (private = false);

-- Users can create their own pins
CREATE POLICY "Users can create own pins"
  ON pinned_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pins
CREATE POLICY "Users can update own pins"
  ON pinned_locations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own pins
CREATE POLICY "Users can delete own pins"
  ON pinned_locations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 10. FISHING REPORTS PERMISSIONS
-- ============================================================================

-- First, ensure the fishing_reports table exists
CREATE TABLE IF NOT EXISTS fishing_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  location_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  species_caught TEXT[],
  photos TEXT[],
  videos TEXT[],
  weather_conditions JSONB,
  visibility VARCHAR(20) DEFAULT 'public',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE fishing_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can view public reports
CREATE POLICY "Public reports are visible to all"
  ON fishing_reports FOR SELECT
  USING (visibility = 'public');

-- Users can view their own reports (any visibility)
CREATE POLICY "Users can view own reports"
  ON fishing_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own reports
CREATE POLICY "Users can create own reports"
  ON fishing_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
  ON fishing_reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports"
  ON fishing_reports FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 11. BOOKINGS PERMISSIONS
-- ============================================================================

-- Ensure bookings table exists with proper structure
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  captain_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trip_date TIMESTAMP NOT NULL,
  trip_location TEXT,
  trip_latitude DECIMAL(10, 8),
  trip_longitude DECIMAL(11, 8),
  duration_hours INTEGER,
  passengers INTEGER,
  total_price DECIMAL(10, 2),
  deposit_paid DECIMAL(10, 2),
  balance_due DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

-- Captains can view bookings for their trips
CREATE POLICY "Captains can view their trip bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = captain_id);

-- Users can create bookings
CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookings (e.g., cancel)
CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Captains can update bookings for their trips (e.g., confirm, complete)
CREATE POLICY "Captains can update their trip bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = captain_id)
  WITH CHECK (auth.uid() = captain_id);

-- Only users can delete their own pending bookings
CREATE POLICY "Users can delete own pending bookings"
  ON bookings FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- ============================================================================
-- 12. COMMENTS/COMMUNITY TABLES (if needed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES fishing_reports(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  helpful_votes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments on public posts
CREATE POLICY "Comments on public posts are visible"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fishing_reports 
      WHERE id = comments.post_id 
      AND visibility = 'public'
    )
  );

-- Users can view their own comments
CREATE POLICY "Users can view own comments"
  ON comments FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 13. FRIENDSHIPS TABLE (for location sharing with friends)
-- ============================================================================

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT valid_friendship_status CHECK (status IN ('pending', 'accepted', 'blocked'))
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can view their own friendships
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friendship requests
CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they're part of (accept/block)
CREATE POLICY "Users can update their friendships"
  ON friendships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete their own friendships
CREATE POLICY "Users can delete their friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================================================
-- 14. GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant sequence permissions (for auto-increment)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 15. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- User stats indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_points ON user_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_activity ON user_stats(last_activity DESC);

-- Points transactions indexes
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id, created_at DESC);

-- Badges indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- Location indexes (for nearby queries)
CREATE INDEX IF NOT EXISTS idx_user_locations_coords ON user_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_user_locations_sharing ON user_locations(sharing_mode);
CREATE INDEX IF NOT EXISTS idx_user_locations_expires ON user_locations(expires_at);

-- Pinned locations indexes
CREATE INDEX IF NOT EXISTS idx_pinned_locations_user ON pinned_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_locations_public ON pinned_locations(private);

-- Fishing reports indexes
CREATE INDEX IF NOT EXISTS idx_fishing_reports_user ON fishing_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fishing_reports_visibility ON fishing_reports(visibility);
CREATE INDEX IF NOT EXISTS idx_fishing_reports_location ON fishing_reports(latitude, longitude);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_captain ON bookings(captain_id, trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(trip_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- ============================================================================
-- 16. ADD MISSING COLUMNS TO USERS TABLE
-- ============================================================================

-- Add columns mentioned in guide if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"weatherAlerts": true}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_captain BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20) DEFAULT 'private';

-- ============================================================================
-- 17. CREATE AUTOMATIC CLEANUP FUNCTION
-- ============================================================================

-- Function to clean up expired locations
CREATE OR REPLACE FUNCTION cleanup_expired_locations()
RETURNS void AS $$
BEGIN
  DELETE FROM user_locations WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create cron job for cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-locations', '0 * * * *', 'SELECT cleanup_expired_locations();');

-- ============================================================================
-- 18. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get nearby users (for location sharing)
CREATE OR REPLACE FUNCTION get_nearby_users(
  search_lat DECIMAL,
  search_lon DECIMAL,
  radius_nm DECIMAL DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_nm DECIMAL,
  user_type VARCHAR,
  sharing_mode VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.user_id,
    ul.latitude,
    ul.longitude,
    (
      3959 * acos(
        cos(radians(search_lat)) * 
        cos(radians(ul.latitude)) * 
        cos(radians(ul.longitude) - radians(search_lon)) + 
        sin(radians(search_lat)) * 
        sin(radians(ul.latitude))
      ) * 0.868976 -- Convert statute miles to nautical miles
    )::DECIMAL as distance_nm,
    ul.user_type,
    ul.sharing_mode
  FROM user_locations ul
  WHERE 
    ul.expires_at > NOW()
    AND ul.sharing_mode IN ('public', 'friends')
    AND (
      3959 * acos(
        cos(radians(search_lat)) * 
        cos(radians(ul.latitude)) * 
        cos(radians(ul.longitude) - radians(search_lon)) + 
        sin(radians(search_lat)) * 
        sin(radians(ul.latitude))
      ) * 0.868976
    ) <= radius_nm
  ORDER BY distance_nm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify RLS is enabled on all tables:
/*
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- View all policies:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
*/

-- ============================================================================
-- NOTES FOR DEPLOYMENT
-- ============================================================================

/*
1. Run this script against your Supabase database
2. Make sure you have auth.uid() available (requires Supabase Auth)
3. Test each policy with actual user accounts
4. Monitor for performance issues with complex policies
5. Consider adding rate limiting for API endpoints
6. Set up database backups before deploying to production
7. Test friend-based location sharing requires friendships table
8. Adjust radius in get_nearby_users() function as needed
9. Set up monitoring for failed RLS policy checks
10. Consider adding audit logging for sensitive operations
*/

-- ============================================================================
-- END OF PERMISSIONS SETUP
-- ============================================================================
