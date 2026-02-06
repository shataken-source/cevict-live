-- SMS Campaign System - Database Schema
-- Bulk SMS campaigns with templates, scheduling, and analytics

-- SMS Campaigns Table
CREATE TABLE IF NOT EXISTS public.sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  target_audience TEXT NOT NULL CHECK (target_audience IN ('all', 'captains', 'customers')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'cancelled')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status ON public.sms_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_scheduled_for ON public.sms_campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_created_by ON public.sms_campaigns(created_by);

-- SMS Campaign Recipients Table
CREATE TABLE IF NOT EXISTS public.sms_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.sms_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opted_out')),
  twilio_sid TEXT,
  cost DECIMAL(10, 4),
  error_message TEXT,
  clicked_links JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_campaign_recipients_campaign_id ON public.sms_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaign_recipients_status ON public.sms_campaign_recipients(status);

-- SMS Campaign Templates Table
CREATE TABLE IF NOT EXISTS public.sms_campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shortened Links Table (for click tracking)
CREATE TABLE IF NOT EXISTS public.shortened_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_url TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  campaign_id UUID REFERENCES public.sms_campaigns(id) ON DELETE SET NULL,
  click_count INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shortened_links_short_code ON public.shortened_links(short_code);
CREATE INDEX IF NOT EXISTS idx_shortened_links_campaign_id ON public.shortened_links(campaign_id);

-- Link Clicks Table
CREATE TABLE IF NOT EXISTS public.link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.shortened_links(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.sms_campaign_recipients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON public.link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_recipient_id ON public.link_clicks(recipient_id);

-- RLS Policies
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortened_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

-- Admin can manage all campaigns
CREATE POLICY "Admins can manage campaigns" ON public.sms_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can view all recipients
CREATE POLICY "Admins can view recipients" ON public.sms_campaign_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can manage templates
CREATE POLICY "Admins can manage templates" ON public.sms_campaign_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Public can access shortened links (for click tracking)
CREATE POLICY "Public can read shortened links" ON public.shortened_links
  FOR SELECT USING (true);

-- Public can insert link clicks
CREATE POLICY "Public can insert link clicks" ON public.link_clicks
  FOR INSERT WITH CHECK (true);
