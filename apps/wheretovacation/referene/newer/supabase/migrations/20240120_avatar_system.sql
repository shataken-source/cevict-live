-- Avatar System Migration - Enterprise Level
-- Created: 2024-01-20

-- User Avatars Table
CREATE TABLE IF NOT EXISTS user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sex VARCHAR(20) NOT NULL DEFAULT 'male',
  skin_color VARCHAR(7) NOT NULL DEFAULT '#f5d0a9',
  hair_style VARCHAR(50) NOT NULL DEFAULT 'short',
  hair_color VARCHAR(7) NOT NULL DEFAULT '#4a3728',
  body_type VARCHAR(50) DEFAULT 'average',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  UNIQUE(user_id)
);

-- Avatar Shop Items
CREATE TABLE IF NOT EXISTS avatar_shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price_points INTEGER NOT NULL DEFAULT 2,
  description TEXT,
  rarity VARCHAR(20) DEFAULT 'common',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Avatar Inventory
CREATE TABLE IF NOT EXISTS user_avatar_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES avatar_shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  is_equipped BOOLEAN DEFAULT false,
  UNIQUE(user_id, item_id)
);

-- Avatar Purchase Transactions (Audit Trail)
CREATE TABLE IF NOT EXISTS avatar_purchase_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES avatar_shop_items(id),
  points_spent INTEGER NOT NULL,
  transaction_type VARCHAR(50) DEFAULT 'purchase',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Avatar Analytics
CREATE TABLE IF NOT EXISTS avatar_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  item_id UUID REFERENCES avatar_shop_items(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_user_avatars_user_id ON user_avatars(user_id);
CREATE INDEX idx_avatar_inventory_user_id ON user_avatar_inventory(user_id);
CREATE INDEX idx_avatar_inventory_item_id ON user_avatar_inventory(item_id);
CREATE INDEX idx_avatar_inventory_equipped ON user_avatar_inventory(user_id, is_equipped);
CREATE INDEX idx_purchase_log_user_id ON avatar_purchase_log(user_id);
CREATE INDEX idx_purchase_log_created_at ON avatar_purchase_log(created_at DESC);
CREATE INDEX idx_shop_items_category ON avatar_shop_items(category, is_active);
CREATE INDEX idx_analytics_event_type ON avatar_analytics(event_type, created_at DESC);

-- RLS Policies
ALTER TABLE user_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_avatar_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_purchase_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own avatar
CREATE POLICY "Users can view own avatar" ON user_avatars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own avatar" ON user_avatars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own avatar" ON user_avatars FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their inventory
CREATE POLICY "Users can view own inventory" ON user_avatar_inventory FOR SELECT USING (auth.uid() = user_id);

-- Everyone can view active shop items
CREATE POLICY "Anyone can view active items" ON avatar_shop_items FOR SELECT USING (is_active = true);

-- Users can view their purchase history
CREATE POLICY "Users can view own purchases" ON avatar_purchase_log FOR SELECT USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_avatar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER avatar_updated_at BEFORE UPDATE ON user_avatars
FOR EACH ROW EXECUTE FUNCTION update_avatar_timestamp();

-- Insert default shop items
INSERT INTO avatar_shop_items (name, category, price_points, rarity) VALUES
('Baseball Cap', 'hat', 2, 'common'),
('Cowboy Hat', 'hat', 2, 'common'),
('Beanie', 'hat', 2, 'common'),
('Aviator Sunglasses', 'sunglasses', 2, 'common'),
('Round Sunglasses', 'sunglasses', 2, 'common'),
('Sport Sunglasses', 'sunglasses', 2, 'common'),
('Leather Bag', 'accessory', 2, 'common'),
('Beach Bag', 'accessory', 2, 'common'),
('T-Shirt', 'top', 2, 'common'),
('Tank Top', 'top', 2, 'common'),
('Polo Shirt', 'top', 2, 'common'),
('Shorts', 'bottom', 2, 'common'),
('Swimsuit', 'bottom', 2, 'common'),
('Board Shorts', 'bottom', 2, 'common')
ON CONFLICT DO NOTHING;
