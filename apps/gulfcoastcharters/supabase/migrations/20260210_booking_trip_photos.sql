-- Booking trip photos: captains and guests can attach photos to a booking (any charter type).
-- Storage bucket trip-photos is used; this table stores the link per booking.
CREATE TABLE IF NOT EXISTS public.booking_trip_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_trip_photos_booking ON public.booking_trip_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_trip_photos_uploaded_by ON public.booking_trip_photos(uploaded_by);

COMMENT ON TABLE public.booking_trip_photos IS 'Photos shared from the boat for a booking (fishing, dolphin, kayak, party, etc.)';

ALTER TABLE public.booking_trip_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trip photos for their bookings"
  ON public.booking_trip_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_trip_photos.booking_id
      AND (b.user_id = auth.uid() OR b.captain_id = auth.uid())
    )
  );

CREATE POLICY "Captains and guests can insert trip photos for their booking"
  ON public.booking_trip_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_trip_photos.booking_id
      AND (b.user_id = auth.uid() OR b.captain_id = auth.uid())
    )
  );
