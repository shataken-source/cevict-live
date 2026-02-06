-- SMS Reminder System - Database Schema
-- Phone verification, SMS preferences, and booking reminders tracking

-- Phone Verification Codes Table
CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_phone_verification_user_id ON public.phone_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verification_code ON public.phone_verification_codes(verification_code);
CREATE INDEX IF NOT EXISTS idx_phone_verification_expires ON public.phone_verification_codes(expires_at);

-- Add SMS fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_phone_verified ON public.profiles(phone_verified) WHERE phone_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_sms_opt_in ON public.profiles(sms_opt_in) WHERE sms_opt_in = TRUE;

-- Booking Reminders Table (if not exists)
CREATE TABLE IF NOT EXISTS public.booking_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('email_1week', 'email_24h', 'email_followup', 'sms_24h')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  message_text TEXT,
  delivery_status TEXT,
  error_message TEXT,
  batch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking_id ON public.booking_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_user_id ON public.booking_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_scheduled_for ON public.booking_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_status ON public.booking_reminders(status);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_type ON public.booking_reminders(reminder_type);

-- RLS Policies for phone_verification_codes
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification codes" ON public.phone_verification_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification codes" ON public.phone_verification_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verification codes" ON public.phone_verification_codes
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for booking_reminders
ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own booking reminders" ON public.booking_reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all reminders" ON public.booking_reminders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to clean up expired verification codes (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.phone_verification_codes
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;
