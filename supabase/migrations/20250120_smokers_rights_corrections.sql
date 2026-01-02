-- SmokersRights Corrections Submissions Table
-- Tracks user-submitted corrections to law cards and directory places

CREATE TABLE IF NOT EXISTS sr_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('law_card', 'directory_place')),
  target_id uuid NOT NULL,
  policy_field text CHECK (
    policy_field IN (
      'indoor_smoking', 'vaping', 'outdoor_public', 'patio_private',
      'retail_sales', 'hemp_restrictions', 'penalties', 'general_info'
    )
  ),
  proposed_summary text,
  proposed_details text,
  proposed_tags text[],
  proposed_source_urls text[],
  source_url text NOT NULL, -- required evidence URL
  confidence text CHECK (confidence IN ('high', 'medium', 'low')) DEFAULT 'medium',
  additional_notes text,
  contact_email text, -- optional contact for follow-up
  submitted_by uuid NOT NULL REFERENCES unified_users(id),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'needs_more_info', 'accepted', 'rejected', 'duplicate'
  )),
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES unified_users(id),
  points_awarded integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Add check constraints to ensure target_id exists in the appropriate table
  CONSTRAINT sr_corrections_target_law_card_check 
    CHECK (target_type != 'law_card' OR EXISTS (
      SELECT 1 FROM sr_law_cards WHERE id = target_id
    )),
  CONSTRAINT sr_corrections_target_directory_place_check 
    CHECK (target_type != 'directory_place' OR EXISTS (
      SELECT 1 FROM sr_directory_places WHERE id = target_id
    ))
);

-- Indexes
CREATE INDEX idx_sr_corrections_target ON sr_corrections(target_type, target_id);
CREATE INDEX idx_sr_corrections_status ON sr_corrections(status);
CREATE INDEX idx_sr_corrections_submitted_by ON sr_corrections(submitted_by);
CREATE INDEX idx_sr_corrections_reviewed_by ON sr_corrections(reviewed_by);

-- RLS
ALTER TABLE sr_corrections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own submissions
CREATE POLICY "Users read own corrections" ON sr_corrections
  FOR SELECT USING (auth.role() = 'authenticated' AND submitted_by = auth.uid());

-- Policy: Authenticated users can submit
CREATE POLICY "Authenticated insert" ON sr_corrections
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update their own submissions (before review)
CREATE POLICY "Creator update own submitted" ON sr_corrections
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    submitted_by = auth.uid() AND
    status IN ('submitted', 'needs_more_info')
  );

-- Policy: Admins full access
CREATE POLICY "Admin full access" ON sr_corrections
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM unified_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Function to award points when correction is accepted
CREATE OR REPLACE FUNCTION award_points_for_correction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Base points
    UPDATE unified_user_stats SET points = points + 50 WHERE user_id = NEW.submitted_by;
    -- Bonus for primary source
    IF NEW.source_url IS NOT NULL AND NEW.source_url LIKE '%.gov%' THEN
      UPDATE unified_user_stats SET points = points + 25 WHERE user_id = NEW.submitted_by;
    END IF;
    -- Update points_awarded
    NEW.points_awarded = CASE
      WHEN NEW.source_url LIKE '%.gov%' THEN 75
      ELSE 50
    END;
    -- Trigger badge evaluation
    PERFORM evaluate_and_award_badges(NEW.submitted_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to award points on acceptance
CREATE TRIGGER sr_corrections_points_trigger
  AFTER UPDATE ON sr_corrections
  FOR EACH ROW EXECUTE FUNCTION award_points_for_correction();

-- Trigger for updated_at
CREATE TRIGGER sr_corrections_updated_at
  BEFORE UPDATE ON sr_corrections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
