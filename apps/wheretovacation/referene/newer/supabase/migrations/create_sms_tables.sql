-- SMS System Database Tables
-- Creates all required tables for SMS verification, notifications, rate limiting, and campaigns

-- Phone verification codes table
CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_active_code UNIQUE (user_id, phone_number, code, used)
);

-- SMS notifications log table
CREATE TABLE IF NOT EXISTS public.sms_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    twilio_sid TEXT,
    error_message TEXT,
    notification_type TEXT DEFAULT 'general',
    campaign_id UUID,
    cost DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SMS rate limits table
CREATE TABLE IF NOT EXISTS public.sms_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_phone UNIQUE (user_id, phone_number)
);

-- SMS campaigns table
CREATE TABLE IF NOT EXISTS public.sms_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'captains', 'customers')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification preferences table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT,
    phone_verified BOOLEAN DEFAULT FALSE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    sms_booking_confirmations BOOLEAN DEFAULT FALSE,
    sms_booking_reminders BOOLEAN DEFAULT FALSE,
    sms_cancellations BOOLEAN DEFAULT FALSE,
    sms_urgent_messages BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_phone_verification_user_phone ON public.phone_verification_codes(user_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verification_expires ON public.phone_verification_codes(expires_at) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS idx_sms_notifications_user ON public.sms_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_created ON public.sms_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_campaign ON public.sms_notifications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_rate_limits_user_phone ON public.sms_rate_limits(user_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status ON public.sms_campaigns(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for phone_verification_codes
CREATE POLICY "Users can view their own verification codes"
    ON public.phone_verification_codes FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policies for sms_notifications
CREATE POLICY "Users can view their own SMS notifications"
    ON public.sms_notifications FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policies for sms_rate_limits
CREATE POLICY "Users can view their own rate limits"
    ON public.sms_rate_limits FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON public.notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON public.notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access to phone_verification_codes"
    ON public.phone_verification_codes
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access to sms_notifications"
    ON public.sms_notifications
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access to sms_rate_limits"
    ON public.sms_rate_limits
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access to sms_campaigns"
    ON public.sms_campaigns
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access to notification_preferences"
    ON public.notification_preferences
    FOR ALL
    USING (true)
    WITH CHECK (true);

