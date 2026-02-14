-- GPS check-in at location for bookings (used by GPSCheckIn + booking-manager)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'check_in_location') THEN
    ALTER TABLE public.bookings ADD COLUMN check_in_location JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'check_in_at') THEN
    ALTER TABLE public.bookings ADD COLUMN check_in_at TIMESTAMPTZ;
  END IF;
END $$;
