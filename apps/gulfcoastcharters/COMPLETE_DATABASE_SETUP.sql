-- CHARTER BOOKING PLATFORM - COMPLETE DATABASE SETUP
-- This file creates everything in the correct order
-- Run this in Supabase SQL Editor

-- Enable extensions first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- DROP existing tables if recreating (CAREFUL!)
-- Uncomment these lines only if you want to start fresh
-- DROP TABLE IF EXISTS public.messages CASCADE;
-- DROP TABLE IF EXISTS public.conversations CASCADE;
-- DROP TABLE IF EXISTS public.payments CASCADE;
-- DROP TABLE IF EXISTS public.subscriptions CASCADE;
-- DROP TABLE IF EXISTS public.weather_alerts CASCADE;
-- DROP TABLE IF EXISTS public.weather_data CASCADE;
-- DROP TABLE IF EXISTS public.notification_log CASCADE;
-- DROP TABLE IF EXISTS public.notifications CASCADE;
-- DROP TABLE IF EXISTS public.pinned_locations CASCADE;
-- DROP TABLE IF EXISTS public.user_locations CASCADE;
-- DROP TABLE IF EXISTS public.daily_check_ins CASCADE;
-- DROP TABLE IF EXISTS public.user_badges CASCADE;
-- DROP TABLE IF EXISTS public.badges CASCADE;
-- DROP TABLE IF EXISTS public.points_transactions CASCADE;
-- DROP TABLE IF EXISTS public.user_stats CASCADE;
-- DROP TABLE IF EXISTS public.fishing_reports CASCADE;
-- DROP TABLE IF EXISTS public.reviews CASCADE;
-- DROP TABLE IF EXISTS public.bookings CASCADE;
-- DROP TABLE IF EXISTS public.boats CASCADE;
-- DROP TABLE IF EXISTS public.captain_profiles CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. PROFILES TABLE (Base user data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    user_type TEXT CHECK (user_type IN ('user', 'captain', 'admin')) DEFAULT 'user',
    phone TEXT,
    bio TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CAPTAIN PROFILES
CREATE TABLE IF NOT EXISTS public.captain_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    license_number TEXT,
    license_expiry DATE,
    years_experience INTEGER,
    boat_name TEXT,
    boat_type TEXT,
    boat_capacity INTEGER,
    boat_length DECIMAL,
    home_port TEXT,
    service_area TEXT[],
    hourly_rate DECIMAL(10,2),
    half_day_rate DECIMAL(10,2),
    full_day_rate DECIMAL(10,2),
    specialties TEXT[],
    languages TEXT[] DEFAULT ARRAY['English'],
    is_verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BOATS
CREATE TABLE IF NOT EXISTS public.boats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    captain_id UUID REFERENCES public.captain_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    make TEXT,
    model TEXT,
    year INTEGER,
    length DECIMAL(10,2),
    capacity INTEGER NOT NULL,
    amenities TEXT[],
    photos TEXT[],
    description TEXT,
    home_port TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    captain_id UUID REFERENCES public.captain_profiles(id) ON DELETE CASCADE,
    boat_id UUID REFERENCES public.boats(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    duration_hours DECIMAL(4,2),
    trip_type TEXT CHECK (trip_type IN ('hourly', 'half_day', 'full_day', 'custom')),
    number_of_guests INTEGER NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    departure_location TEXT,
    target_species TEXT[],
    special_requests TEXT,
    weather_alert_sent BOOLEAN DEFAULT FALSE,
    weather_alert_sent_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    captain_id UUID REFERENCES public.captain_profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    title TEXT,
    comment TEXT,
    photos TEXT[],
    is_verified BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id, reviewer_id)
);

-- 6. FISHING REPORTS
CREATE TABLE IF NOT EXISTS public.fishing_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    location TEXT,
    coordinates GEOGRAPHY(POINT),
    species_caught TEXT[],
    weather_conditions TEXT,
    water_conditions TEXT,
    bait_used TEXT[],
    techniques TEXT[],
    photos TEXT[],
    videos TEXT[],
    is_public BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. USER STATS
CREATE TABLE IF NOT EXISTS public.user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_check_in DATE,
    trust_level TEXT CHECK (trust_level IN ('new', 'member', 'regular', 'trusted', 'veteran')) DEFAULT 'new',
    posts_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    days_active INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. POINTS TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.points_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BADGES
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT,
    requirement_type TEXT,
    requirement_value INTEGER,
    points_value INTEGER DEFAULT 0,
    rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')) DEFAULT 'common',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. USER BADGES
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    progress INTEGER DEFAULT 0,
    is_displayed BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, badge_id)
);

-- 11. DAILY CHECK-INS
CREATE TABLE IF NOT EXISTS public.daily_check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    streak_day INTEGER DEFAULT 1,
    points_earned INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, check_in_date)
);

-- 12. USER LOCATIONS
CREATE TABLE IF NOT EXISTS public.user_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy DECIMAL(10,2),
    heading DECIMAL(5,2),
    speed DECIMAL(10,2),
    sharing_mode TEXT CHECK (sharing_mode IN ('private', 'friends', 'public')) DEFAULT 'private',
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. PINNED LOCATIONS
CREATE TABLE IF NOT EXISTS public.pinned_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    category TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    visit_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 15. NOTIFICATION LOG
CREATE TABLE IF NOT EXISTS public.notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    channel TEXT CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
    recipient TEXT NOT NULL,
    subject TEXT,
    content TEXT,
    status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'bounced')) DEFAULT 'pending',
    error_message TEXT,
    metadata JSONB,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. WEATHER DATA
CREATE TABLE IF NOT EXISTS public.weather_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location TEXT NOT NULL,
    coordinates GEOGRAPHY(POINT),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    buoy_id TEXT,
    wind_speed DECIMAL(5,2),
    wind_direction DECIMAL(5,2),
    gust_speed DECIMAL(5,2),
    wave_height DECIMAL(5,2),
    wave_period DECIMAL(5,2),
    water_temperature DECIMAL(5,2),
    air_temperature DECIMAL(5,2),
    pressure DECIMAL(7,2),
    visibility DECIMAL(5,2),
    conditions TEXT,
    forecast_date DATE,
    data_timestamp TIMESTAMPTZ NOT NULL,
    source TEXT,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. WEATHER ALERTS
CREATE TABLE IF NOT EXISTS public.weather_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    alert_type TEXT CHECK (alert_type IN ('info', 'caution', 'warning', 'danger')) NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'moderate', 'high', 'severe')) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    conditions JSONB,
    recommendation TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan TEXT CHECK (plan IN ('free', 'pro', 'captain')) DEFAULT 'free',
    status TEXT CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')) DEFAULT 'active',
    price DECIMAL(10,2),
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start DATE,
    current_period_end DATE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_method TEXT,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    refund_amount DECIMAL(10,2),
    refund_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participants UUID[] NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    last_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments TEXT[],
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_captain_id ON public.bookings(captain_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_fishing_reports_user_id ON public.fishing_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_fishing_reports_created_at ON public.fishing_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON public.points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON public.user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_geography ON public.user_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_pinned_locations_geography ON public.pinned_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_fishing_reports_geography ON public.fishing_reports USING GIST(coordinates);

-- CREATE FUNCTIONS

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to award points
CREATE OR REPLACE FUNCTION award_points(
    p_user_id UUID,
    p_points INTEGER,
    p_action TEXT,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL
)
RETURNS TABLE(points_earned INTEGER, total_points INTEGER, new_badges UUID[]) AS $$
DECLARE
    v_total_points INTEGER;
    v_new_badges UUID[];
BEGIN
    INSERT INTO public.points_transactions (user_id, points, action, description, reference_id, reference_type)
    VALUES (p_user_id, p_points, p_action, p_description, p_reference_id, p_reference_type);
    
    INSERT INTO public.user_stats (user_id, total_points)
    VALUES (p_user_id, p_points)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_points = user_stats.total_points + p_points,
        updated_at = NOW()
    RETURNING user_stats.total_points INTO v_total_points;
    
    v_new_badges := ARRAY[]::UUID[];
    
    RETURN QUERY SELECT p_points, v_total_points, v_new_badges;
END;
$$ LANGUAGE plpgsql;

-- Function to update captain ratings
CREATE OR REPLACE FUNCTION update_captain_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.captain_profiles
    SET 
        rating = (
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM public.reviews
            WHERE captain_id = NEW.captain_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM public.reviews
            WHERE captain_id = NEW.captain_id
        ),
        updated_at = NOW()
    WHERE id = NEW.captain_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_stats (user_id, total_points)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE TRIGGERS

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_captain_profiles_updated_at ON public.captain_profiles;
CREATE TRIGGER update_captain_profiles_updated_at BEFORE UPDATE ON public.captain_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fishing_reports_updated_at ON public.fishing_reports;
CREATE TRIGGER update_fishing_reports_updated_at BEFORE UPDATE ON public.fishing_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_captain_rating_on_review ON public.reviews;
CREATE TRIGGER update_captain_rating_on_review
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_captain_rating();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ENABLE ROW LEVEL SECURITY

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captain_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fishing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- DROP existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public reports viewable by everyone" ON public.fishing_reports;
DROP POLICY IF EXISTS "Users can create fishing reports" ON public.fishing_reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.fishing_reports;
DROP POLICY IF EXISTS "User stats viewable by everyone" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- CREATE RLS POLICIES

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Bookings policies
CREATE POLICY "Users can view own bookings"
    ON public.bookings FOR SELECT
    USING (
        auth.uid() = bookings.user_id OR 
        auth.uid() IN (
            SELECT cp.user_id 
            FROM public.captain_profiles cp 
            WHERE cp.id = bookings.captain_id
        )
    );

CREATE POLICY "Users can create bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (auth.uid() = bookings.user_id);

CREATE POLICY "Users can update own bookings"
    ON public.bookings FOR UPDATE
    USING (auth.uid() = bookings.user_id);

-- Fishing reports policies
CREATE POLICY "Public reports viewable by everyone"
    ON public.fishing_reports FOR SELECT
    USING (is_public = true OR auth.uid() = fishing_reports.user_id);

CREATE POLICY "Users can create fishing reports"
    ON public.fishing_reports FOR INSERT
    WITH CHECK (auth.uid() = fishing_reports.user_id);

CREATE POLICY "Users can update own reports"
    ON public.fishing_reports FOR UPDATE
    USING (auth.uid() = fishing_reports.user_id);

-- User stats policies
CREATE POLICY "User stats viewable by everyone"
    ON public.user_stats FOR SELECT
    USING (true);

CREATE POLICY "Users can update own stats"
    ON public.user_stats FOR UPDATE
    USING (auth.uid() = user_stats.user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = notifications.user_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = notifications.user_id);

-- INSERT STARTER BADGES

INSERT INTO public.badges (name, description, icon, category, requirement_type, requirement_value, points_value, rarity)
VALUES
    ('Breaking the Ice', 'Posted your first fishing report', '🎣', 'reports', 'post_count', 1, 10, 'common'),
    ('Chronicler', 'Posted 50 fishing reports', '📚', 'reports', 'post_count', 50, 50, 'uncommon'),
    ('Legend', 'Posted 200 fishing reports', '🏆', 'reports', 'post_count', 200, 200, 'epic'),
    ('Helper', 'Received 25 helpful votes', '🤝', 'community', 'helpful_votes', 25, 50, 'uncommon'),
    ('Community Veteran', 'Active for 180 days', '👑', 'engagement', 'days_active', 180, 100, 'rare'),
    ('Streak Master', 'Maintained a 30-day check-in streak', '🔥', 'engagement', 'streak', 30, 100, 'rare'),
    ('Early Bird', 'Checked in for 7 consecutive days', '🌅', 'engagement', 'streak', 7, 25, 'common'),
    ('Photo Pro', 'Uploaded photos to 10 reports', '📸', 'reports', 'photos', 10, 30, 'uncommon'),
    ('Video Guru', 'Uploaded videos to 5 reports', '🎥', 'reports', 'videos', 5, 50, 'rare'),
    ('Location Scout', 'Pinned 20 favorite fishing spots', '📍', 'exploration', 'pins', 20, 40, 'uncommon')
ON CONFLICT (name) DO NOTHING;

-- SUCCESS!
SELECT 'DATABASE SETUP COMPLETE! All 21 tables created successfully.' AS status;
