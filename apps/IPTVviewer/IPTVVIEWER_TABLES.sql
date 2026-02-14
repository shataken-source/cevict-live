-- IPTV Viewer Supabase Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS iptv_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    tier_id TEXT NOT NULL DEFAULT 'free',
    tier_name TEXT NOT NULL,
    is_trial BOOLEAN DEFAULT FALSE,
    trial_used BOOLEAN DEFAULT FALSE,
    is_lifetime BOOLEAN DEFAULT FALSE,
    max_devices INTEGER DEFAULT 1,
    expires_at TIMESTAMP WITH TIME ZONE,
    provider_code TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE iptv_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own subscription" ON iptv_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON iptv_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON iptv_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- DEVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS iptv_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES iptv_subscriptions(user_id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    license_key TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

-- Enable RLS
ALTER TABLE iptv_devices ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own devices" ON iptv_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON iptv_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON iptv_devices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON iptv_devices
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FAVORITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS iptv_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_logo TEXT,
    channel_group TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

-- Enable RLS
ALTER TABLE iptv_favorites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own favorites" ON iptv_favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON iptv_favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON iptv_favorites
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- SMART CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS iptv_smart_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#888888',
    keywords JSONB NOT NULL DEFAULT '[]',
    auto_add BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE iptv_smart_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own categories" ON iptv_smart_categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" ON iptv_smart_categories
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- RECORDINGS TABLE (Cloud Recordings)
-- ============================================
CREATE TABLE IF NOT EXISTS iptv_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    program_title TEXT NOT NULL,
    program_description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER,
    recording_url TEXT,
    thumbnail_url TEXT,
    file_size_bytes BIGINT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE iptv_recordings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own recordings" ON iptv_recordings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings" ON iptv_recordings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recordings" ON iptv_recordings
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PROVIDER CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS iptv_provider_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    provider_name TEXT NOT NULL,
    discount_percent INTEGER DEFAULT 0,
    commission_percent INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    max_activations INTEGER,
    current_activations INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (admins only)
ALTER TABLE iptv_provider_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage provider codes" ON iptv_provider_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- ============================================
-- WATCH HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS iptv_watch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_seconds INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE iptv_watch_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own watch history" ON iptv_watch_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watch history" ON iptv_watch_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Keep only last 100 entries per user
CREATE OR REPLACE FUNCTION trim_watch_history()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM iptv_watch_history
    WHERE user_id = NEW.user_id
    AND id NOT IN (
        SELECT id FROM iptv_watch_history
        WHERE user_id = NEW.user_id
        ORDER BY watched_at DESC
        LIMIT 100
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trim_watch_history_trigger
    AFTER INSERT ON iptv_watch_history
    FOR EACH ROW EXECUTE FUNCTION trim_watch_history();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_iptv_devices_user ON iptv_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_iptv_devices_active ON iptv_devices(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_iptv_favorites_user ON iptv_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_iptv_recordings_user ON iptv_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_iptv_recordings_expires ON iptv_recordings(expires_at);
CREATE INDEX IF NOT EXISTS idx_iptv_watch_history_user ON iptv_watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_iptv_subscriptions_expires ON iptv_subscriptions(expires_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get active device count for user
CREATE OR REPLACE FUNCTION get_active_device_count(user_uuid UUID)
RETURNS INTEGER AS $$
SELECT COUNT(*) FROM iptv_devices
WHERE user_id = user_uuid AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user can add device
CREATE OR REPLACE FUNCTION can_add_device(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    max_devs INTEGER;
    active_devs INTEGER;
BEGIN
    SELECT max_devices INTO max_devs
    FROM iptv_subscriptions
    WHERE user_id = user_uuid;

    SELECT COUNT(*) INTO active_devs
    FROM iptv_devices
    WHERE user_id = user_uuid AND is_active = TRUE;

    RETURN (active_devs < max_devs) OR (max_devs = -1); -- -1 = unlimited
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SAMPLE DATA - Provider Codes
-- ============================================
INSERT INTO iptv_provider_codes (code, provider_name, discount_percent, commission_percent)
VALUES
    ('EXAMPLE20', 'Example IPTV', 20, 15),
    ('WELCOME10', 'New User Special', 10, 10)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- STORAGE BUCKETS (run in Supabase Dashboard)
-- ============================================
-- Go to Storage > Create new bucket
-- Create bucket: 'iptv-recordings'
-- Create bucket: 'iptv-thumbnails'
-- Set public access policies as needed
