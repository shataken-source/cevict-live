-- SmokersRights Law Cards Table
-- Stores state-level smoking/vaping policy summaries with sources and tags

CREATE TABLE IF NOT EXISTS sr_law_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code text NOT NULL CHECK (state_code ~ '^[A-Z]{2}$'), -- US state abbreviation
  state_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('indoor_smoking', 'vaping', 'outdoor_public', 'patio_private', 'retail_sales', 'hemp_restrictions', 'penalties')),
  summary text NOT NULL,
  details text,
  tags text[] DEFAULT '{}',
  source_urls text[] DEFAULT '{}',
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES unified_users(id),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(state_code, category)
);

-- Indexes for fast lookups
CREATE INDEX idx_sr_law_cards_state_code ON sr_law_cards(state_code);
CREATE INDEX idx_sr_law_cards_category ON sr_law_cards(category);
CREATE INDEX idx_sr_law_cards_active ON sr_law_cards(is_active);
CREATE INDEX idx_sr_law_cards_last_verified ON sr_law_cards(last_verified_at);

-- RLS
ALTER TABLE sr_law_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active law cards
CREATE POLICY "Public read access for active law cards" ON sr_law_cards
  FOR SELECT USING (is_active = true);

-- Policy: Authenticated users can submit new cards (go to moderation)
CREATE POLICY "Authenticated insert" ON sr_law_cards
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only admins or creators can update
CREATE POLICY "Admin or creator update" ON sr_law_cards
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM unified_users WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Policy: Only admins can delete
CREATE POLICY "Admin delete" ON sr_law_cards
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM unified_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER sr_law_cards_updated_at
  BEFORE UPDATE ON sr_law_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
