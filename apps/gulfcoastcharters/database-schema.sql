-- Charter Booking Platform Database Schema
-- Complete PostgreSQL/Supabase schema for all features
-- Includes: users, bookings, weather, gamification, locations, and more

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geographic queries
CREATE EXTENSION IF NOT EXISTS "pg_cron"; -- For scheduled jobs

-- =====================================================
-- USERS AND AUTHENTICATION
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    bio TEXT,
    location VARCHAR(255),
    
    -- Trust level and gamification
    trust_level INTEGER DEFAULT 0,
    trust_level_name VARCHAR(50) DEFAULT 'New Member',
    total_points INTEGER DEFAULT 0,
    
    -- User type
    is_captain BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_moderator BOOLEAN DEFAULT FALSE,
    
    -- Subscription
    subscription_tier VARCHAR(20) DEFAULT 'free', -- free, pro, captain
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Preferences
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,
    privacy_settings JSONB DEFAULT '{"profile_public": true, "show_location": false}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Captain profiles
CREATE TABLE IF NOT EXISTS public.captains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Business info
    business_name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    insurance_number VARCHAR(100),
    coast_guard_license VARCHAR(100),
    
    -- Location
    dock_location VARCHAR(255),
    service_areas TEXT[], -- Array of service area names
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Contact
    business_phone VARCHAR(20),
    business_email VARCHAR(255),
    website_url TEXT,
    emergency_contact JSONB,
    
    -- Operations
    years_experience INTEGER,
    max_passengers INTEGER,
    languages_spoken TEXT[],
    specialties TEXT[], -- fishing types, tours, etc.
    
    -- Ratings
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    
    -- Commission settings
    commission_rate DECIMAL(4, 2) DEFAULT 8.00, -- Platform commission %
    payout_method VARCHAR(50), -- stripe, bank, check
    payout_details JSONB,
    
    -- Status
    verification_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, suspended
    featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    
    -- Documents
    documents JSONB, -- Store document URLs and metadata
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TRIPS AND BOOKINGS
-- =====================================================

-- Trip types offered by captains
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    captain_id UUID REFERENCES public.captains(id) ON DELETE CASCADE,
    
    -- Trip details
    trip_name VARCHAR(255) NOT NULL,
    trip_type VARCHAR(50) NOT NULL, -- fishing, sunset_sail, tour, etc.
    description TEXT,
    departure_location VARCHAR(255),
    duration_hours DECIMAL(3, 1),
    
    -- Capacity
    min_passengers INTEGER DEFAULT 1,
    max_passengers INTEGER NOT NULL,
    
    -- Pricing
    price_per_person DECIMAL(10, 2),
    price_private_charter DECIMAL(10, 2),
    deposit_required DECIMAL(10, 2),
    
    -- Schedule
    available_days INTEGER[], -- 0=Sunday, 6=Saturday
    departure_times TIME[],
    season_start DATE,
    season_end DATE,
    
    -- Features
    includes TEXT[], -- What's included
    requirements TEXT[], -- What to bring
    restrictions TEXT[], -- Age, health restrictions
    
    -- Photos
    photos JSONB,
    
    -- Status
    active BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    captain_id UUID REFERENCES public.captains(id) ON DELETE SET NULL,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    
    -- Booking details
    booking_number VARCHAR(20) UNIQUE NOT NULL,
    trip_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    passenger_count INTEGER NOT NULL,
    is_private_charter BOOLEAN DEFAULT FALSE,
    
    -- Passenger info
    passengers JSONB, -- Array of passenger details
    special_requests TEXT,
    
    -- Pricing
    subtotal DECIMAL(10, 2) NOT NULL,
    deposit_paid DECIMAL(10, 2) DEFAULT 0,
    taxes DECIMAL(10, 2) DEFAULT 0,
    fees DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2), -- Platform commission
    
    -- Payment
    payment_method VARCHAR(50), -- card, cash, check
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, deposit_paid, paid, refunded
    stripe_payment_intent_id VARCHAR(255),
    
    -- Weather monitoring
    last_weather_check TIMESTAMP WITH TIME ZONE,
    weather_alert_level VARCHAR(20), -- safe, caution, warning, danger
    weather_conditions JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES public.users(id),
    
    -- Reviews
    review_id UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- GAMIFICATION SYSTEM
-- =====================================================

-- User statistics
CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Points
    total_points INTEGER DEFAULT 0,
    points_this_week INTEGER DEFAULT 0,
    points_this_month INTEGER DEFAULT 0,
    points_this_year INTEGER DEFAULT 0,
    
    -- Content stats
    posts_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    photos_count INTEGER DEFAULT 0,
    videos_count INTEGER DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    
    -- Engagement stats
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_check_in DATE,
    days_active INTEGER DEFAULT 0,
    
    -- Special stats
    fish_caught INTEGER DEFAULT 0,
    trips_logged INTEGER DEFAULT 0,
    spots_shared INTEGER DEFAULT 0,
    weather_updates INTEGER DEFAULT 0,
    gear_reviews INTEGER DEFAULT 0,
    tournaments_won INTEGER DEFAULT 0,
    
    -- Captain specific
    captain_reports INTEGER DEFAULT 0,
    safety_tips_shared INTEGER DEFAULT 0,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Points transactions log
CREATE TABLE IF NOT EXISTS public.points_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    points INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User badges
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL,
    badge_name VARCHAR(100) NOT NULL,
    badge_description TEXT,
    badge_icon VARCHAR(10),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, badge_id)
);

-- Daily check-ins
CREATE TABLE IF NOT EXISTS public.daily_check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    streak_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, check_in_date)
);

-- =====================================================
-- COMMUNITY FEATURES
-- =====================================================

-- Fishing reports (posts)
CREATE TABLE IF NOT EXISTS public.fishing_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    catch_details JSONB, -- Species, size, quantity, etc.
    location VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Media
    photos JSONB,
    videos JSONB,
    
    -- Metadata
    weather_conditions JSONB,
    tide_info JSONB,
    techniques_used TEXT[],
    gear_used TEXT[],
    
    -- Engagement
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    
    -- Moderation
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, hidden
    moderated_by UUID REFERENCES public.users(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderation_notes TEXT,
    
    -- Features
    is_featured BOOLEAN DEFAULT FALSE,
    featured_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    fishing_report_id UUID REFERENCES public.fishing_reports(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    is_helpful BOOLEAN DEFAULT FALSE,
    helpful_votes INTEGER DEFAULT 0,
    
    status VARCHAR(20) DEFAULT 'active', -- active, hidden, deleted
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- LOCATION TRACKING
-- =====================================================

-- Real-time user locations
CREATE TABLE IF NOT EXISTS public.user_locations (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Position
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2), -- meters
    altitude DECIMAL(10, 2), -- meters
    altitude_accuracy DECIMAL(10, 2),
    heading DECIMAL(5, 2), -- degrees
    speed DECIMAL(10, 2), -- m/s
    
    -- Settings
    sharing_mode VARCHAR(20) DEFAULT 'private', -- private, friends, public
    user_type VARCHAR(20), -- user, captain
    
    -- Metadata
    metadata JSONB,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pinned locations
CREATE TABLE IF NOT EXISTS public.pinned_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    notes TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_type VARCHAR(50), -- fishing_spot, launch, favorite, etc.
    
    metadata JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User location settings
CREATE TABLE IF NOT EXISTS public.user_location_settings (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    
    default_privacy VARCHAR(20) DEFAULT 'private',
    auto_start BOOLEAN DEFAULT FALSE,
    update_interval INTEGER DEFAULT 5000, -- milliseconds
    
    share_with_friends BOOLEAN DEFAULT FALSE,
    share_with_captains BOOLEAN DEFAULT FALSE,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

-- In-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL, -- badge_earned, weather_alert, booking_reminder, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    metadata JSONB,
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification log (email/SMS)
CREATE TABLE IF NOT EXISTS public.notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL, -- email, sms, push
    recipient VARCHAR(255),
    subject VARCHAR(255),
    content TEXT,
    metadata JSONB,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- REVIEWS AND RATINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    captain_id UUID REFERENCES public.captains(id) ON DELETE CASCADE,
    
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    
    -- Specific ratings
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    vessel_rating INTEGER CHECK (vessel_rating >= 1 AND vessel_rating <= 5),
    experience_rating INTEGER CHECK (experience_rating >= 1 AND experience_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    
    -- Photos
    photos JSONB,
    
    -- Captain response
    captain_response TEXT,
    captain_response_at TIMESTAMP WITH TIME ZONE,
    
    -- Moderation
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, hidden
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update user points
CREATE OR REPLACE FUNCTION update_user_points(
    p_user_id UUID,
    p_points_to_add INTEGER,
    p_action VARCHAR
)
RETURNS TABLE(total_points INTEGER) AS $$
BEGIN
    -- Update user stats
    UPDATE user_stats
    SET 
        total_points = total_points + p_points_to_add,
        points_this_week = points_this_week + p_points_to_add,
        points_this_month = points_this_month + p_points_to_add,
        points_this_year = points_this_year + p_points_to_add,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
    
    -- Update user trust level in users table
    UPDATE users
    SET 
        total_points = (
            SELECT us.total_points 
            FROM user_stats us 
            WHERE us.user_id = p_user_id
        )
    WHERE id = p_user_id;
    
    RETURN QUERY
    SELECT us.total_points
    FROM user_stats us
    WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate distance between coordinates
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    R CONSTANT DECIMAL := 3959; -- Earth's radius in miles
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);
    
    a := SIN(dLat / 2) * SIN(dLat / 2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dLon / 2) * SIN(dLon / 2);
    
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_captains_updated_at BEFORE UPDATE ON captains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fishing_reports_updated_at BEFORE UPDATE ON fishing_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_trust_level ON users(trust_level);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);

-- Captain indexes
CREATE INDEX idx_captains_user_id ON captains(user_id);
CREATE INDEX idx_captains_location ON captains(latitude, longitude);
CREATE INDEX idx_captains_verification_status ON captains(verification_status);

-- Booking indexes
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_captain_id ON bookings(captain_id);
CREATE INDEX idx_bookings_trip_date ON bookings(trip_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_number ON bookings(booking_number);

-- Points and gamification indexes
CREATE INDEX idx_points_transactions_user_id ON points_transactions(user_id);
CREATE INDEX idx_points_transactions_created_at ON points_transactions(created_at);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_daily_check_ins_user_date ON daily_check_ins(user_id, check_in_date);

-- Community indexes
CREATE INDEX idx_fishing_reports_user_id ON fishing_reports(user_id);
CREATE INDEX idx_fishing_reports_status ON fishing_reports(status);
CREATE INDEX idx_fishing_reports_created_at ON fishing_reports(created_at);
CREATE INDEX idx_comments_report_id ON comments(fishing_report_id);

-- Location indexes
CREATE INDEX idx_user_locations_sharing ON user_locations(sharing_mode);
CREATE INDEX idx_user_locations_coords ON user_locations(latitude, longitude);
CREATE INDEX idx_pinned_locations_user_id ON pinned_locations(user_id);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE captains ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE fishing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Public profiles for captains
CREATE POLICY "Public can view captain profiles" ON captains
    FOR SELECT USING (verification_status = 'verified' AND active = true);

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = user_id);

-- Captains can view bookings for their trips
CREATE POLICY "Captains can view their bookings" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM captains c 
            WHERE c.id = bookings.captain_id 
            AND c.user_id = auth.uid()
        )
    );

-- Public can view approved fishing reports
CREATE POLICY "Public can view approved reports" ON fishing_reports
    FOR SELECT USING (status = 'approved');

-- Users can create their own reports
CREATE POLICY "Users can create reports" ON fishing_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update own reports" ON fishing_reports
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- SEED DATA (Optional)
-- =====================================================

-- Insert default badges definitions (metadata only, not user badges)
INSERT INTO public.user_stats (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;

-- Create weather alert cron job (requires pg_cron extension)
-- This would be set up in Supabase dashboard or via SQL
-- SELECT cron.schedule(
--     'weather-alerts',
--     '0 * * * *', -- Every hour
--     'SELECT net.http_post(
--         url := ''https://your-project.supabase.co/functions/v1/weather-alerts'',
--         headers := jsonb_build_object(''Authorization'', ''Bearer YOUR_ANON_KEY''),
--         body := jsonb_build_object(''check_all'', true)
--     );'
-- );
