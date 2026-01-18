-- Email Campaign System for Admin Panel
-- Allows admins to send T-shirt votes, announcements, and other campaigns

-- Campaign templates table
CREATE TABLE IF NOT EXISTS email_campaign_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb, -- e.g., ["name", "email"]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES email_campaign_templates(id),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sender_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'draft', -- draft, scheduled, sending, sent, failed
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign recipients table
CREATE TABLE IF NOT EXISTS email_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    variables JSONB DEFAULT '{}'::jsonb, -- personalization data
    status TEXT DEFAULT 'pending', -- pending, sent, failed, bounced
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE email_campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can manage templates"
    ON email_campaign_templates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Only admins can manage campaigns
CREATE POLICY "Admins can manage campaigns"
    ON email_campaigns
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Only admins can view recipients
CREATE POLICY "Admins can view recipients"
    ON email_campaign_recipients
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Insert default templates
INSERT INTO email_campaign_templates (name, subject, body, variables) VALUES
(
    'T-Shirt Vote',
    'Vote on Gulf Coast Charters logo shirts (big back logo + pocket front)',
    E'Hey {name},\n\nI''m finalizing Gulf Coast Charters T‑shirts and I''ve settled on one style:\n\n- Big GCC logo on the back\n- Small GCC logo + short slogan on the front pocket area\n\nNo extra artwork—just our real logo, clean and professional.\n\nWhat I need from you\n\nPlease reply with:\n\n1) Which front pocket slogan do you like best?\n   (all with a small GCC logo next to or above the text)\n\n   A) "Gulf Coast Charters – Captain''s Crew"\n   B) "Gulf Coast Charters – Life''s Better on the Water"\n   C) "Gulf Coast Charters – Reel Adventures"\n   D) "Gulf Coast Charters – Est. 2024"\n\n2) Shirt color(s) you''d actually wear\n   - White\n   - Navy\n   - Black\n   - Heather gray\n   - Light blue\n   - Other: _________\n\n3) Size\n   - S / M / L / XL / XXL / other\n\nA short reply like this is perfect:\nBack logo + C, navy or heather gray, XL\n\nThanks for helping me lock this in,\nShane\nGulf Coast Charters',
    '["name", "email"]'::jsonb
),
(
    'General Announcement',
    'Update from Gulf Coast Charters',
    E'Hey {name},\n\nWe wanted to share some exciting news with you!\n\n{announcement_body}\n\nThanks for being part of the Gulf Coast Charters community.\n\nBest,\nShane\nGulf Coast Charters',
    '["name", "announcement_body"]'::jsonb
);

-- Function to get campaign stats
CREATE OR REPLACE FUNCTION get_campaign_stats(campaign_uuid UUID)
RETURNS TABLE (
    total_recipients BIGINT,
    sent_count BIGINT,
    pending_count BIGINT,
    failed_count BIGINT,
    opened_count BIGINT,
    clicked_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_recipients,
        COUNT(*) FILTER (WHERE status = 'sent')::BIGINT as sent_count,
        COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_count,
        COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_count,
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::BIGINT as opened_count,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::BIGINT as clicked_count
    FROM email_campaign_recipients
    WHERE campaign_id = campaign_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
