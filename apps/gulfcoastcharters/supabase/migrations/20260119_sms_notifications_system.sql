-- SMS Notifications System - Database Schema
-- Twilio-based SMS notifications with rate limiting and cost tracking

-- SMS Notifications Table
CREATE TABLE IF NOT EXISTS public.sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'booking_confirmed',
    'booking_reminder',
    'booking_cancelled',
    'urgent_message',
    'verification_code'
  )),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  twilio_sid TEXT,
  cost DECIMAL(10, 4),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sms_notifications_user_id ON public.sms_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_created_at ON public.sms_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON public.sms_notifications(status);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_type ON public.sms_notifications(notification_type);

-- SMS Rate Limits Table
CREATE TABLE IF NOT EXISTS public.sms_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_sms_rate_limits_user_id ON public.sms_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_rate_limits_window_start ON public.sms_rate_limits(window_start);

-- Notification Preferences Table (if not exists)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  sms_booking_confirmed BOOLEAN DEFAULT FALSE,
  sms_booking_reminder BOOLEAN DEFAULT FALSE,
  sms_booking_cancelled BOOLEAN DEFAULT FALSE,
  sms_urgent_message BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- RLS Policies for sms_notifications
ALTER TABLE public.sms_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own SMS notifications" ON public.sms_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all SMS notifications" ON public.sms_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for sms_rate_limits
ALTER TABLE public.sms_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits" ON public.sms_rate_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage rate limits" ON public.sms_rate_limits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Function to clean up old rate limit windows (older than 2 hours)
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.sms_rate_limits
  WHERE window_start < NOW() - INTERVAL '2 hours';
END;
$$;
