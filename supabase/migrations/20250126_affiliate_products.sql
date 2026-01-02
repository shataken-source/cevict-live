-- Create affiliate_products table for SmokersRights admin
CREATE TABLE IF NOT EXISTS affiliate_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('cbd', 'vapes', 'papers', 'nicotine', 'cbd_oil', 'cbd_gummies', 'delta_8')),
  price DECIMAL(10, 2) NOT NULL,
  affiliate_link TEXT NOT NULL,
  commission_rate DECIMAL(5, 4) DEFAULT 0.10, -- 10% default commission
  clicks INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_affiliate_products_category ON affiliate_products(category);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_created_at ON affiliate_products(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_affiliate_products_updated_at
  BEFORE UPDATE ON affiliate_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated admin users to read/write
-- Note: This assumes you have an auth.users table. Adjust based on your auth setup.
CREATE POLICY "Admin can manage products"
  ON affiliate_products
  FOR ALL
  USING (true) -- In production, check for admin role
  WITH CHECK (true);

-- Create table for tracking product clicks
CREATE TABLE IF NOT EXISTS product_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES affiliate_products(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_product_clicks_product_id ON product_clicks(product_id);
CREATE INDEX IF NOT EXISTS idx_product_clicks_clicked_at ON product_clicks(clicked_at DESC);

-- Create table for tracking product sales
CREATE TABLE IF NOT EXISTS product_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES affiliate_products(id) ON DELETE CASCADE,
  sale_amount DECIMAL(10, 2),
  commission_amount DECIMAL(10, 2),
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  transaction_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_product_sales_product_id ON product_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_sale_date ON product_sales(sale_date DESC);

-- Create function to increment product clicks
CREATE OR REPLACE FUNCTION increment_product_clicks(product_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE affiliate_products
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

