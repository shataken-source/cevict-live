-- Avatar System
-- User avatar customization, shop, inventory, purchase log, analytics

CREATE TABLE IF NOT EXISTS user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  sex TEXT DEFAULT 'male',                 -- 'male', 'female', 'other'
  skin_color TEXT DEFAULT '#f5d0a9',       -- hex color
  hair_style TEXT DEFAULT 'short',         -- 'short', 'medium', 'long', 'bald', 'curly', 'braids', 'ponytail'
  hair_color TEXT DEFAULT '#4a3728',       -- hex color
  body_type TEXT DEFAULT 'average',        -- 'slim', 'average', 'athletic', 'large'
  background_color TEXT DEFAULT '#3B82F6', -- hex color for avatar card bg
  equipped_hat TEXT,                       -- avatar_shop_items.id
  equipped_glasses TEXT,
  equipped_accessory TEXT,
  equipped_clothing TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS avatar_shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,                  -- 'hat', 'glasses', 'accessory', 'clothing', 'background'
  subcategory TEXT,                        -- 'fishing_hat', 'sunglasses', 'captain_hat', etc.
  image_url TEXT,
  preview_url TEXT,
  price_points INTEGER NOT NULL DEFAULT 2,
  rarity TEXT DEFAULT 'common',            -- 'common', 'uncommon', 'rare', 'epic', 'legendary'
  is_active BOOLEAN DEFAULT true,
  is_seasonal BOOLEAN DEFAULT false,
  season TEXT,                             -- 'summer', 'winter', 'halloween', etc.
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_avatar_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES avatar_shop_items(id),
  is_equipped BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS avatar_purchase_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES avatar_shop_items(id),
  points_spent INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS avatar_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,                -- 'shop_viewed', 'item_purchased', 'item_equipped', 'avatar_updated'
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_avatars_user ON user_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_category ON avatar_shop_items(category);
CREATE INDEX IF NOT EXISTS idx_shop_items_active ON avatar_shop_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_avatar_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_equipped ON user_avatar_inventory(user_id, is_equipped) WHERE is_equipped = true;
CREATE INDEX IF NOT EXISTS idx_purchase_log_user ON avatar_purchase_log(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON avatar_analytics(event_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED: Avatar shop items
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO avatar_shop_items (name, description, category, subcategory, price_points, rarity, display_order) VALUES
-- Hats
('Captain''s Hat', 'Classic white captain''s hat with gold trim', 'hat', 'captain_hat', 5, 'uncommon', 1),
('Fishing Bucket Hat', 'Wide-brim sun protection hat', 'hat', 'fishing_hat', 2, 'common', 2),
('Straw Sun Hat', 'Beach-ready straw hat', 'hat', 'sun_hat', 2, 'common', 3),
('Pirate Tricorn', 'Arr matey! Classic pirate hat', 'hat', 'pirate_hat', 10, 'rare', 4),
('Visor', 'Sporty sun visor', 'hat', 'visor', 2, 'common', 5),
('Tournament Winner Cap', 'Gold trophy emblem baseball cap', 'hat', 'trophy_cap', 20, 'epic', 6),
-- Glasses
('Aviator Sunglasses', 'Classic aviator shades', 'glasses', 'aviators', 3, 'uncommon', 1),
('Sport Wraparounds', 'Polarized fishing sunglasses', 'glasses', 'sport', 2, 'common', 2),
('Gold Rimmed Shades', 'Luxury gold-framed sunglasses', 'glasses', 'luxury', 8, 'rare', 3),
('Diving Goggles', 'Professional diving mask', 'glasses', 'diving', 5, 'uncommon', 4),
-- Accessories
('Anchor Necklace', 'Sterling silver anchor pendant', 'accessory', 'necklace', 3, 'uncommon', 1),
('Fishing Rod', 'Custom rod over the shoulder', 'accessory', 'fishing_rod', 5, 'uncommon', 2),
('Parrot on Shoulder', 'Colorful parrot companion', 'accessory', 'parrot', 15, 'epic', 3),
('Captain''s Wheel Badge', 'Ship''s wheel lapel pin', 'accessory', 'badge', 2, 'common', 4),
('Trophy Fish', 'Holding a prize marlin', 'accessory', 'trophy_fish', 25, 'legendary', 5),
-- Clothing
('Hawaiian Shirt', 'Tropical floral print shirt', 'clothing', 'hawaiian', 3, 'common', 1),
('Captain''s Uniform', 'Full white captain''s uniform', 'clothing', 'uniform', 10, 'rare', 2),
('Wetsuit', 'Professional diving wetsuit', 'clothing', 'wetsuit', 5, 'uncommon', 3),
('Board Shorts', 'Colorful beach board shorts', 'clothing', 'shorts', 2, 'common', 4),
('Life Jacket', 'Safety-first orange life jacket', 'clothing', 'life_jacket', 2, 'common', 5),
-- Backgrounds
('Sunset Ocean', 'Golden sunset over the Gulf', 'background', 'sunset', 5, 'uncommon', 1),
('Deep Sea Blue', 'Deep ocean blue gradient', 'background', 'ocean', 2, 'common', 2),
('Tropical Beach', 'Palm trees and white sand', 'background', 'beach', 3, 'uncommon', 3),
('Starry Night', 'Night sky with stars over water', 'background', 'night', 8, 'rare', 4),
('Golden Reef', 'Coral reef with tropical fish', 'background', 'reef', 15, 'epic', 5)
ON CONFLICT DO NOTHING;
