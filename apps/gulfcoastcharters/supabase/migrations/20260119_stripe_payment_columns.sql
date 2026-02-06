-- Add Stripe checkout session ID to bookings table
-- This allows tracking Stripe checkout sessions before payment completion

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_checkout_session 
  ON public.bookings(stripe_checkout_session_id);

-- Add payment_status column if it doesn't exist (some schemas may have it)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT 
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) 
  DEFAULT 'pending';

-- Add index for payment status queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status 
  ON public.bookings(payment_status);

-- Ensure payments table has all required columns
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_stripe_checkout_session 
  ON public.payments(stripe_checkout_session_id);
