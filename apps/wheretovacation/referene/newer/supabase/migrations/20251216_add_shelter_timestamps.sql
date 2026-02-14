-- Add timestamps to shelters for tracking discoveries
ALTER TABLE shelters
ADD COLUMN IF NOT EXISTS date_added TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;
COMMENT ON COLUMN shelters.date_added IS 'Timestamp when the shelter was first added to the system';
COMMENT ON COLUMN shelters.last_scraped_at IS 'Timestamp of the latest automated scrape for this shelter';
COMMENT ON COLUMN shelters.welcome_email_sent_at IS 'Timestamp when welcome email about PetReunion was sent';