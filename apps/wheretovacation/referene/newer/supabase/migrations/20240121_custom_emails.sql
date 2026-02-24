-- Custom Email Addresses System
-- Allows users to purchase @gulfcoastcharters.com email addresses

-- Create custom_emails table
CREATE TABLE IF NOT EXISTS custom_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL UNIQUE,
  email_prefix TEXT NOT NULL UNIQUE,
  user_type TEXT NOT NULL CHECK (user_type IN ('captain', 'customer')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'points', 'prize')),
  amount_paid DECIMAL(10,2),
  points_spent INTEGER,
  forward_to_email TEXT,
  is_active BOOLEAN DEFAULT true,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_custom_emails_user_id ON custom_emails(user_id);
CREATE INDEX idx_custom_emails_email_prefix ON custom_emails(email_prefix);
CREATE INDEX idx_custom_emails_is_active ON custom_emails(is_active);

-- Create function to check email limit
CREATE OR REPLACE FUNCTION check_custom_email_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM custom_emails 
      WHERE user_id = NEW.user_id 
      AND user_type = NEW.user_type 
      AND is_active = true) >= 1 THEN
    RAISE EXCEPTION 'User already has a custom email for this account type';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for email limit
CREATE TRIGGER enforce_custom_email_limit
  BEFORE INSERT ON custom_emails
  FOR EACH ROW
  EXECUTE FUNCTION check_custom_email_limit();

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_custom_email_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp
CREATE TRIGGER update_custom_email_timestamp
  BEFORE UPDATE ON custom_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_email_timestamp();

-- Enable RLS
ALTER TABLE custom_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own custom emails"
  ON custom_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom emails"
  ON custom_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom emails"
  ON custom_emails FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all custom emails"
  ON custom_emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all custom emails"
  ON custom_emails FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create view for admin dashboard
CREATE OR REPLACE VIEW custom_emails_admin_view AS
SELECT 
  ce.*,
  u.email as user_email,
  u.raw_user_meta_data->>'full_name' as user_name
FROM custom_emails ce
JOIN auth.users u ON ce.user_id = u.id
ORDER BY ce.created_at DESC;

-- Grant access to view
GRANT SELECT ON custom_emails_admin_view TO authenticated;

-- Add comment
COMMENT ON TABLE custom_emails IS 'Stores purchased custom @gulfcoastcharters.com email addresses';
