-- PetReunion: Pre-registration should be FREE; paid feature is proactive monitoring.
-- This migration makes the database defaults reflect the "soft gate" behavior.
-- Safe to re-run.

-- Default new rows to inactive (monitoring off) unless explicitly activated.
ALTER TABLE public.pre_registered_pets
  ALTER COLUMN subscription_status SET DEFAULT 'inactive';

-- Standardize price (annual).
ALTER TABLE public.pre_registered_pets
  ALTER COLUMN subscription_price_usd SET DEFAULT 19.95;

-- Leave subscription_started_at default as-is for backward compatibility (some code assumes NOT NULL).
-- Activation should set subscription_status='active' and subscription_expires_at = NOW() + interval '1 year'.

NOTIFY pgrst, 'reload schema';

