-- 2026-01-18: affiliate_products schema enhancements
-- Supports enterprise marketplace UI (no more local JSON/hardcoded arrays)

-- Make category flexible (the original migration used a CHECK constraint)
ALTER TABLE affiliate_products
  DROP CONSTRAINT IF EXISTS affiliate_products_category_check;

ALTER TABLE affiliate_products
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS sponsor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS image_url text;

-- Public can read active products
DROP POLICY IF EXISTS "Public read active affiliate products" ON affiliate_products;
CREATE POLICY "Public read active affiliate products"
  ON affiliate_products
  FOR SELECT
  USING (is_active = true);

-- Service role full access (admin dashboard should use service role via server routes)
DROP POLICY IF EXISTS "Service role full access affiliate products" ON affiliate_products;
CREATE POLICY "Service role full access affiliate products"
  ON affiliate_products
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

