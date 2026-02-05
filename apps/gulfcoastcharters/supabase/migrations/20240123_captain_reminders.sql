-- Add tracking for document expiration reminders
ALTER TABLE captain_documents 
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Add profile update tracking to captain profiles
CREATE TABLE IF NOT EXISTS captain_profile_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  captain_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  update_type TEXT, -- 'manual', 'document', 'settings', etc.
  UNIQUE(captain_id, updated_at)
);

-- Add last profile update reminder tracking
CREATE TABLE IF NOT EXISTS captain_profile_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  captain_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  reminder_type TEXT DEFAULT 'profile_update',
  UNIQUE(captain_id, sent_at)
);

-- Enable RLS
ALTER TABLE captain_profile_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE captain_profile_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Captains can view own profile updates"
  ON captain_profile_updates FOR SELECT
  USING (auth.uid() = captain_id);

CREATE POLICY "System can insert profile updates"
  ON captain_profile_updates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all reminders"
  ON captain_profile_reminders FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "System can insert reminders"
  ON captain_profile_reminders FOR INSERT
  WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_captain_docs_reminder ON captain_documents(expiry_date, last_reminder_sent_at);
CREATE INDEX IF NOT EXISTS idx_profile_updates_captain ON captain_profile_updates(captain_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_reminders_captain ON captain_profile_reminders(captain_id, sent_at DESC);
