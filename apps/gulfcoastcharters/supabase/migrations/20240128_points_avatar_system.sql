-- Points and Avatar System
-- Created by Cascade

-- Create point_transactions table to track all point movements
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.avatar_item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.avatar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.avatar_item_categories(id) NOT NULL,
  price INTEGER NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_avatar_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.avatar_items(id) NOT NULL,
  is_equipped BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.user_avatar_loadout (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hat_id UUID REFERENCES public.avatar_items(id),
  shirt_id UUID REFERENCES public.avatar_items(id),
  gear_id UUID REFERENCES public.avatar_items(id),
  effect_id UUID REFERENCES public.avatar_items(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON public.point_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_avatar_items_category ON public.avatar_items(category_id);
CREATE INDEX IF NOT EXISTS idx_user_avatar_inventory_user ON public.user_avatar_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_avatar_inventory_item ON public.user_avatar_inventory(item_id);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatar_item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatar_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatar_loadout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own point transactions"
  ON public.point_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Avatar item categories are public"
  ON public.avatar_item_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Avatar items are public"
  ON public.avatar_items
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can manage their own avatar inventory"
  ON public.user_avatar_inventory
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own avatar loadout"
  ON public.user_avatar_loadout
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_user_points(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(points), 0)
  FROM public.point_transactions
  WHERE user_id = user_uuid;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.award_points(
  user_uuid UUID,
  points_amount INTEGER,
  trans_type TEXT,
  reference_id UUID DEFAULT NULL,
  description TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.point_transactions (
    user_id,
    points,
    transaction_type,
    reference_id,
    description
  ) VALUES (
    user_uuid,
    points_amount,
    trans_type,
    reference_id,
    COALESCE(description, 
      CASE trans_type
        WHEN 'signup' THEN 'Welcome bonus for signing up!'
        WHEN 'booking' THEN 'Points for booking a charter'
        WHEN 'charter_complete' THEN 'Points for completing a charter'
        WHEN 'message' THEN 'Points for posting a message'
        WHEN 'thread' THEN 'Points for creating a thread'
        WHEN 'reaction' THEN 'Points for receiving a reaction'
        WHEN 'daily_login' THEN 'Daily login bonus'
        WHEN 'purchase' THEN 'Points spent on avatar purchase'
        WHEN 'media_upload' THEN 'Points spent on video upload'
        ELSE 'Points awarded'
      END
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_enough_points(
  user_uuid UUID,
  required_points INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT public.get_user_points(user_uuid) >= required_points);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.purchase_avatar_item(
  user_uuid UUID,
  item_uuid UUID
) RETURNS JSONB AS $$
DECLARE
  item_price INTEGER;
  item_name TEXT;
  item_category_id UUID;
  result JSONB;
BEGIN
  SELECT price, name, category_id INTO item_price, item_name, item_category_id
  FROM public.avatar_items
  WHERE id = item_uuid AND is_active = true;
  IF item_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item not found or not available');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_avatar_inventory WHERE user_id = user_uuid AND item_id = item_uuid) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You already own this item');
  END IF;

  IF NOT public.has_enough_points(user_uuid, item_price) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not enough points');
  END IF;

  PERFORM public.award_points(
    user_uuid,
    -item_price,
    'purchase',
    item_uuid,
    'Purchased ' || item_name
  );

  INSERT INTO public.user_avatar_inventory (user_id, item_id)
  VALUES (user_uuid, item_uuid);

  IF NOT EXISTS (
    SELECT 1 FROM public.user_avatar_inventory i
    JOIN public.avatar_items ai ON i.item_id = ai.id
    WHERE i.user_id = user_uuid 
    AND ai.category_id = item_category_id
    AND i.item_id != item_uuid
  ) THEN
    PERFORM public.equip_avatar_item(user_uuid, item_uuid);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Item purchased successfully',
    'points_balance', public.get_user_points(user_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.equip_avatar_item(
  user_uuid UUID,
  item_uuid UUID
) RETURNS JSONB AS $$
DECLARE
  item_category_id UUID;
  item_category_name TEXT;
  loadout_exists BOOLEAN;
BEGIN
  SELECT ai.category_id, aic.name INTO item_category_id, item_category_name
  FROM public.avatar_items ai
  JOIN public.avatar_item_categories aic ON ai.category_id = aic.id
  WHERE ai.id = item_uuid;

  IF item_category_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item not found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_avatar_inventory WHERE user_id = user_uuid AND item_id = item_uuid) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You do not own this item');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_avatar_loadout WHERE user_id = user_uuid) INTO loadout_exists;

  IF loadout_exists THEN
    EXECUTE format('
      UPDATE public.user_avatar_loadout
      SET %I = $1, updated_at = NOW()
      WHERE user_id = $2',
      item_category_name || '_id'
    ) USING item_uuid, user_uuid;
  ELSE
    EXECUTE format('
      INSERT INTO public.user_avatar_loadout (user_id, %I)
      VALUES ($1, $2)',
      item_category_name || '_id'
    ) USING user_uuid, item_uuid;
  END IF;

  UPDATE public.user_avatar_inventory
  SET is_equipped = true
  WHERE user_id = user_uuid AND item_id = item_uuid;

  UPDATE public.user_avatar_inventory i
  SET is_equipped = false
  FROM public.avatar_items ai
  WHERE i.user_id = user_uuid
  AND i.item_id = ai.id
  AND ai.category_id = item_category_id
  AND i.item_id != item_uuid;

  RETURN jsonb_build_object('success', true, 'message', 'Item equipped successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_equipped_items(user_uuid UUID)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  item_id UUID,
  item_name TEXT,
  item_image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aic.id AS category_id,
    aic.name AS category_name,
    ai.id AS item_id,
    ai.name AS item_name,
    ai.image_url AS item_image_url
  FROM public.avatar_item_categories aic
  LEFT JOIN LATERAL (
    SELECT ai.id, ai.name, ai.image_url
    FROM public.user_avatar_loadout ual
    JOIN public.avatar_items ai ON (
      (aic.name = 'hat' AND ual.hat_id = ai.id) OR
      (aic.name = 'shirt' AND ual.shirt_id = ai.id) OR
      (aic.name = 'fishing_gear' AND ual.gear_id = ai.id) OR
      (aic.name = 'effect' AND ual.effect_id = ai.id)
    )
    WHERE ual.user_id = user_uuid
    LIMIT 1
  ) ai ON true
  ORDER BY aic.name;
END;
$$ LANGUAGE plpgsql STABLE;

INSERT INTO public.avatar_item_categories (id, name, display_name) VALUES
  (gen_random_uuid(), 'hat', 'Hats'),
  (gen_random_uuid(), 'shirt', 'Shirts'),
  (gen_random_uuid(), 'fishing_gear', 'Fishing Gear'),
  (gen_random_uuid(), 'effect', 'Special Effects')
ON CONFLICT DO NOTHING;

INSERT INTO public.avatar_items (id, name, description, category_id, price, rarity, image_url) VALUES
  (
    gen_random_uuid(),
    'Fishing Cap',
    'A classic fishing cap to keep the sun out of your eyes',
    (SELECT id FROM public.avatar_item_categories WHERE name = 'hat' LIMIT 1),
    50,
    'common',
    '/images/avatar/hats/fishing_cap.png'
  ),
  (
    gen_random_uuid(),
    'Captain''s Hat',
    'Show everyone you mean business with this captain''s hat',
    (SELECT id FROM public.avatar_item_categories WHERE name = 'hat' LIMIT 1),
    200,
    'uncommon',
    '/images/avatar/hats/captains_hat.png'
  ),
  (
    gen_random_uuid(),
    'Basic T-Shirt',
    'A comfortable t-shirt for your fishing adventures',
    (SELECT id FROM public.avatar_item_categories WHERE name = 'shirt' LIMIT 1),
    100,
    'common',
    '/images/avatar/shirts/tshirt_blue.png'
  ),
  (
    gen_random_uuid(),
    'Fishing Vest',
    'Plenty of pockets for all your fishing gear',
    (SELECT id FROM public.avatar_item_categories WHERE name = 'shirt' LIMIT 1),
    300,
    'uncommon',
    '/images/avatar/shirts/fishing_vest.png'
  ),
  (
    gen_random_uuid(),
    'Basic Fishing Rod',
    'A trusty fishing rod for beginners',
    (SELECT id FROM public.avatar_item_categories WHERE name = 'fishing_gear' LIMIT 1),
    150,
    'common',
    '/images/avatar/gear/rod_basic.png'
  ),
  (
    gen_random_uuid(),
    'Pro Fishing Rod',
    'The choice of champions',
    (SELECT id FROM public.avatar_item_categories WHERE name = 'fishing_gear' LIMIT 1),
    500,
    'rare',
    '/images/avatar/gear/rod_pro.png'
  ),
  (
    gen_random_uuid(),
    'Fish Aura',
    'A subtle fishy aura that surrounds you',
    (SELECT id FROM public.avatar_item_categories WHERE name = 'effect' LIMIT 1),
    200,
    'uncommon',
    '/images/avatar/effects/fish_aura.png'
  ),
  (
    gen_random_uuid(),
    'Golden Glow',
    'Shine bright with this golden glow',
    (SELECT id FROM public.avatar_item_categories WHERE name = 'effect' LIMIT 1),
    1000,
    'legendary',
    '/images/avatar/effects/golden_glow.png'
  )
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.award_points(NEW.id, 100, 'signup');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.award_daily_login_bonus(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  last_login DATE;
  today DATE := CURRENT_DATE;
BEGIN
  SELECT MAX(created_at)::DATE INTO last_login
  FROM public.point_transactions
  WHERE user_id = user_uuid AND transaction_type = 'daily_login';
  IF last_login IS NULL OR last_login < today THEN
    PERFORM public.award_points(user_uuid, 5, 'daily_login', NULL, 'Daily login bonus');
    RETURN jsonb_build_object('awarded', true, 'points', 5, 'message', 'Daily login bonus awarded');
  ELSE
    RETURN jsonb_build_object('awarded', false, 'message', 'Daily login bonus already claimed today');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_points_breakdown(user_uuid UUID)
RETURNS TABLE (
  transaction_type TEXT,
  points INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.transaction_type,
    pt.points,
    pt.description,
    pt.created_at
  FROM public.point_transactions pt
  WHERE pt.user_id = user_uuid
  ORDER BY pt.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_shop_items(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category_id UUID,
  category_name TEXT,
  price INTEGER,
  rarity TEXT,
  image_url TEXT,
  owned BOOLEAN,
  equipped BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id,
    ai.name,
    ai.description,
    ai.category_id,
    aic.name AS category_name,
    ai.price,
    ai.rarity,
    ai.image_url,
    COALESCE(uai.item_id IS NOT NULL, false) AS owned,
    COALESCE(uai.is_equipped, false) AS equipped
  FROM public.avatar_items ai
  JOIN public.avatar_item_categories aic ON ai.category_id = aic.id
  LEFT JOIN public.user_avatar_inventory uai ON uai.item_id = ai.id AND uai.user_id = user_uuid
  WHERE ai.is_active = true
  ORDER BY aic.name, ai.rarity, ai.price;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_user_inventory(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  item_id UUID,
  item_name TEXT,
  item_description TEXT,
  category_id UUID,
  category_name TEXT,
  rarity TEXT,
  image_url TEXT,
  is_equipped BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uai.id,
    ai.id AS item_id,
    ai.name AS item_name,
    ai.description AS item_description,
    ai.category_id,
    aic.name AS category_name,
    ai.rarity,
    ai.image_url,
    uai.is_equipped
  FROM public.user_avatar_inventory uai
  JOIN public.avatar_items ai ON uai.item_id = ai.id
  JOIN public.avatar_item_categories aic ON ai.category_id = aic.id
  WHERE uai.user_id = user_uuid
  ORDER BY aic.name, ai.rarity, ai.name;
END;
$$ LANGUAGE plpgsql STABLE;
