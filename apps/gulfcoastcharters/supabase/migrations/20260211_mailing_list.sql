-- Mailing list for newsletter/SMS signups and admin management
-- Used by: NewsletterSignup, MailingListManager, mailing-list-manager edge function

CREATE TABLE IF NOT EXISTS mailing_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'unsubscribed')),
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT mailing_list_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_mailing_list_status ON mailing_list(status);
CREATE INDEX IF NOT EXISTS idx_mailing_list_email ON mailing_list(LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mailing_list_phone ON mailing_list(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mailing_list_subscribed_at ON mailing_list(subscribed_at DESC);

ALTER TABLE mailing_list ENABLE ROW LEVEL SECURITY;

-- Access only via edge function (service role). No direct client access.
CREATE POLICY "Allow all for service role"
  ON mailing_list FOR ALL
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON mailing_list FROM anon, authenticated;
GRANT ALL ON mailing_list TO service_role;

COMMENT ON TABLE mailing_list IS 'Newsletter/SMS signups; managed via mailing-list-manager edge function';
