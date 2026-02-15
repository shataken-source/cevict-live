-- =====================================================
-- SMOKERSRIGHTS DATABASE SCHEMA
-- Run this in Supabase SQL Editor: https://rdbuwyefbgnbuhmjrizo.supabase.co
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. BOOKMARKS SYSTEM
-- =====================================================

-- Bookmark Folders (for organizing saved items)
CREATE TABLE IF NOT EXISTS sr_bookmark_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookmarks (saved laws, places, comparisons)
CREATE TABLE IF NOT EXISTS sr_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    folder_id UUID REFERENCES sr_bookmark_folders(id) ON DELETE SET NULL,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('law', 'place', 'comparison')),
    item_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);

-- =====================================================
-- 2. LEGISLATION TRACKER
-- =====================================================

-- Legislation Bills (real-time bill tracking)
CREATE TABLE IF NOT EXISTS sr_legislation_bills (
    id VARCHAR(50) PRIMARY KEY,
    state VARCHAR(2) NOT NULL,
    bill_number VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('introduced', 'committee', 'passed_house', 'passed_senate', 'signed', 'vetoed', 'dead')),
    category VARCHAR(30) NOT NULL CHECK (category IN ('indoor_smoking', 'outdoor_smoking', 'vaping', 'taxation', 'age_restrictions', 'retail')),
    impact VARCHAR(10) NOT NULL CHECK (impact IN ('positive', 'negative', 'neutral')),
    impact_description TEXT NOT NULL,
    sponsors JSONB DEFAULT '[]',
    introduced_date DATE NOT NULL,
    last_action_date DATE NOT NULL,
    last_action TEXT NOT NULL,
    votes JSONB,
    effective_date DATE,
    source_url TEXT,
    alert_level VARCHAR(10) NOT NULL CHECK (alert_level IN ('urgent', 'important', 'monitor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legislation Alerts (notifications for bill changes)
CREATE TABLE IF NOT EXISTS sr_legislation_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id VARCHAR(50) NOT NULL REFERENCES sr_legislation_bills(id) ON DELETE CASCADE,
    state VARCHAR(2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('status_change', 'new_bill', 'vote_scheduled', 'passed', 'signed')),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legislation Subscriptions (email alerts)
CREATE TABLE IF NOT EXISTS sr_legislation_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    states JSONB NOT NULL DEFAULT '[]',
    categories JSONB NOT NULL DEFAULT '[]',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tracked Bills (user-specific bill tracking)
CREATE TABLE IF NOT EXISTS sr_tracked_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    bill_id VARCHAR(50) NOT NULL REFERENCES sr_legislation_bills(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, bill_id)
);

-- =====================================================
-- 3. SMOKING-FRIENDLY PLACES
-- =====================================================

-- Places (smoking-friendly locations)
CREATE TABLE IF NOT EXISTS sr_places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('bar', 'restaurant', 'lounge', 'outdoor', 'hotel', 'casino')),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip VARCHAR(10),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    phone VARCHAR(20),
    website TEXT,
    smoking_policy VARCHAR(20) NOT NULL CHECK (smoking_policy IN ('allowed', 'designated', 'outdoor-only', 'vape-only')),
    features JSONB DEFAULT '[]',
    rating DECIMAL(2, 1) DEFAULT 0,
    reviews INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    submitted_by UUID,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Place Reviews
CREATE TABLE IF NOT EXISTS sr_place_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id UUID NOT NULL REFERENCES sr_places(id) ON DELETE CASCADE,
    user_id UUID,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    visit_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. AFFILIATE MARKETPLACE
-- =====================================================

-- Products (affiliate marketplace)
CREATE TABLE IF NOT EXISTS sr_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('vape', 'cbd', 'hemp', 'accessories', 'alternative')),
    price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2),
    image_url TEXT,
    affiliate_url TEXT NOT NULL,
    vendor VARCHAR(100) NOT NULL,
    rating DECIMAL(2, 1) DEFAULT 0,
    reviews INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    in_stock BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Reviews
CREATE TABLE IF NOT EXISTS sr_product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES sr_products(id) ON DELETE CASCADE,
    user_id UUID,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. USER PREFERENCES & NOTIFICATIONS
-- =====================================================

-- User Preferences
CREATE TABLE IF NOT EXISTS sr_user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    newsletter_subscription BOOLEAN DEFAULT TRUE,
    alert_states JSONB DEFAULT '[]',
    alert_categories JSONB DEFAULT '[]',
    home_state VARCHAR(2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Subscribers (non-registered users)
CREATE TABLE IF NOT EXISTS sr_email_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    subscribed_states JSONB DEFAULT '[]',
    subscribed_categories JSONB DEFAULT '[]',
    confirmed BOOLEAN DEFAULT FALSE,
    confirmation_token VARCHAR(255),
    unsubscribe_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. LAW CARDS (Recent Updates)
-- =====================================================

-- Law Cards (recent law updates display)
CREATE TABLE IF NOT EXISTS sr_law_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_code VARCHAR(2) NOT NULL,
    state_name VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    summary TEXT NOT NULL,
    details TEXT,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- 7. AGE VERIFICATION LOG
-- =====================================================

-- Age Verification Log (compliance)
CREATE TABLE IF NOT EXISTS sr_age_verification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    session_id VARCHAR(255),
    verified BOOLEAN NOT NULL,
    method VARCHAR(20) CHECK (method IN ('biometric', 'document', 'database', 'self_declared')),
    risk_score INTEGER,
    compliance_token VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. ANALYTICS & TRACKING
-- =====================================================

-- Page Views
CREATE TABLE IF NOT EXISTS sr_page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    session_id VARCHAR(255) NOT NULL,
    page_path TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search Queries
CREATE TABLE IF NOT EXISTS sr_search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    query TEXT NOT NULL,
    filters JSONB,
    results_count INTEGER,
    clicked_result UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON sr_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_type ON sr_bookmarks(item_type);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON sr_bookmarks(folder_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_user ON sr_bookmark_folders(user_id);

-- Legislation indexes
CREATE INDEX IF NOT EXISTS idx_legislation_state ON sr_legislation_bills(state);
CREATE INDEX IF NOT EXISTS idx_legislation_status ON sr_legislation_bills(status);
CREATE INDEX IF NOT EXISTS idx_legislation_alert ON sr_legislation_bills(alert_level);
CREATE INDEX IF NOT EXISTS idx_legislation_alerts_bill ON sr_legislation_alerts(bill_id);
CREATE INDEX IF NOT EXISTS idx_legislation_alerts_state ON sr_legislation_alerts(state);

-- Places indexes
CREATE INDEX IF NOT EXISTS idx_places_state ON sr_places(state);
CREATE INDEX IF NOT EXISTS idx_places_type ON sr_places(type);
CREATE INDEX IF NOT EXISTS idx_places_policy ON sr_places(smoking_policy);
CREATE INDEX IF NOT EXISTS idx_places_location ON sr_places(lat, lng);
CREATE INDEX IF NOT EXISTS idx_places_verified ON sr_places(verified) WHERE verified = TRUE;

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON sr_products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON sr_products(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_active ON sr_products(is_active) WHERE is_active = TRUE;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_page_views_session ON sr_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON sr_page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_search_queries_user ON sr_search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_created ON sr_search_queries(created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE sr_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sr_bookmark_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sr_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sr_tracked_bills ENABLE ROW LEVEL SECURITY;

-- Bookmarks policies
CREATE POLICY "Users can only see their own bookmarks"
    ON sr_bookmarks FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own folders"
    ON sr_bookmark_folders FOR ALL
    USING (user_id = auth.uid());

-- User preferences policies
CREATE POLICY "Users can only see their own preferences"
    ON sr_user_preferences FOR ALL
    USING (user_id = auth.uid());

-- Tracked bills policies
CREATE POLICY "Users can only see their own tracked bills"
    ON sr_tracked_bills FOR ALL
    USING (user_id = auth.uid());

-- Legislation is public
CREATE POLICY "Legislation is publicly readable"
    ON sr_legislation_bills FOR SELECT
    USING (true);

CREATE POLICY "Legislation alerts are publicly readable"
    ON sr_legislation_alerts FOR SELECT
    USING (true);

-- Places are public
CREATE POLICY "Places are publicly readable"
    ON sr_places FOR SELECT
    USING (true);

CREATE POLICY "Place reviews are publicly readable"
    ON sr_place_reviews FOR SELECT
    USING (true);

-- Products are public
CREATE POLICY "Products are publicly readable"
    ON sr_products FOR SELECT
    USING (true);

-- Law cards are public
CREATE POLICY "Law cards are publicly readable"
    ON sr_law_cards FOR SELECT
    USING (true);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample legislation bills
INSERT INTO sr_legislation_bills (id, state, bill_number, title, summary, status, category, impact, impact_description, sponsors, introduced_date, last_action_date, last_action, alert_level)
VALUES
('ga-hb-123', 'GA', 'HB 123', 'Tobacco Product Tax Increase Act', 'Proposes increasing the state tobacco tax by $1.00 per pack to fund healthcare programs.', 'committee', 'taxation', 'negative', 'Would increase cigarette prices significantly', '["Rep. Smith", "Rep. Johnson"]', '2024-01-15', '2024-12-20', 'Referred to Ways and Means Committee', 'important'),
('ga-sb-456', 'GA', 'SB 456', 'Outdoor Smoking Area Designation Act', 'Would require designated outdoor smoking areas in public spaces rather than complete bans.', 'introduced', 'outdoor_smoking', 'positive', 'Would protect smokers'' rights in outdoor areas', '["Sen. Williams"]', '2024-11-01', '2024-12-15', 'First reading', 'monitor'),
('fl-hb-789', 'FL', 'HB 789', 'Vaping Product Flavor Ban', 'Would ban flavored vaping products except tobacco flavor.', 'passed_house', 'vaping', 'negative', 'Would eliminate most vaping options', '["Rep. Garcia"]', '2024-02-01', '2024-12-18', 'Passed House 78-42', 'urgent'),
('nc-sb-101', 'NC', 'SB 101', 'Tobacco Heritage Preservation Act', 'Would prevent localities from enacting smoking restrictions stricter than state law.', 'committee', 'indoor_smoking', 'positive', 'Would preempt local smoking bans', '["Sen. Brown", "Sen. Davis"]', '2024-03-15', '2024-12-10', 'Referred to Commerce Committee', 'important');

-- Insert sample places
INSERT INTO sr_places (name, type, address, city, state, smoking_policy, features, rating, reviews, verified)
VALUES
('The Smoking Room', 'lounge', '123 Main St', 'Atlanta', 'GA', 'allowed', '["Full Bar", "Live Music", "Outdoor Patio"]', 4.5, 127, true),
('Bourbon & Cigars', 'bar', '456 Oak Ave', 'Atlanta', 'GA', 'designated', '["Cigar Selection", "Private Rooms", "Happy Hour"]', 4.8, 89, true),
('Cloud Nine Vape Lounge', 'lounge', '789 Peach St', 'Atlanta', 'GA', 'vape-only', '["Vape Products", "Gaming", "WiFi"]', 4.2, 56, false),
('The Garden Terrace', 'outdoor', '321 Park Blvd', 'Atlanta', 'GA', 'outdoor-only', '["Restaurant", "Pet Friendly", "Parking"]', 4.6, 203, true);

-- Insert sample products
INSERT INTO sr_products (name, description, category, price, affiliate_url, vendor, rating, reviews, featured)
VALUES
('Premium Vape Starter Kit', 'Complete vaping kit with adjustable settings and long-lasting battery', 'vape', 79.99, 'https://affiliate.example.com/vape-kit', 'VapeCo', 4.7, 234, true),
('CBD Relief Tincture', 'High-quality CBD oil for relaxation and wellness', 'cbd', 49.99, 'https://affiliate.example.com/cbd-oil', 'CBD Wellness', 4.5, 189, true),
('Hemp Rolling Papers', 'Organic hemp papers for a smooth smoking experience', 'hemp', 5.99, 'https://affiliate.example.com/hemp-papers', 'Raw', 4.8, 567, false),
('Portable Ashtray', 'Sleek pocket ashtray for on-the-go smokers', 'accessories', 12.99, 'https://affiliate.example.com/ashtray', 'SmokeGear', 4.3, 89, false);

-- Insert law cards
INSERT INTO sr_law_cards (state_code, state_name, category, summary, is_active)
VALUES
('AL', 'Alabama', 'indoor_smoking', 'Statewide indoor smoking restrictions for public workplaces; local ordinances may be stricter.', true),
('FL', 'Florida', 'vaping', 'Clean Indoor Air Act updated to include vaping in most indoor workplaces; beaches/localities may add outdoor restrictions.', true),
('GA', 'Georgia', 'indoor_smoking', 'Smokefree Air Act limits indoor smoking with exemptions for bars and certain hospitality venues.', true);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON sr_bookmarks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookmark_folders_updated_at BEFORE UPDATE ON sr_bookmark_folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_legislation_bills_updated_at BEFORE UPDATE ON sr_legislation_bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_legislation_subscriptions_updated_at BEFORE UPDATE ON sr_legislation_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_places_updated_at BEFORE UPDATE ON sr_places FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON sr_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON sr_user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_subscribers_updated_at BEFORE UPDATE ON sr_email_subscribers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DONE! Tables created successfully.
-- =====================================================
