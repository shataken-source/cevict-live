-- Community events (no mock data).

CREATE TABLE IF NOT EXISTS public.community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('charter-meetup', 'fishing-tournament', 'sailing-club', 'group-booking')),
  description TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  max_attendees INTEGER NOT NULL DEFAULT 10,
  price NUMERIC,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_events_date ON public.community_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON public.community_event_attendees(event_id);

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_event_attendees ENABLE ROW LEVEL SECURITY;

-- Public can view events.
CREATE POLICY "View community events"
  ON public.community_events
  FOR SELECT
  USING (true);

-- Only creator can manage their event.
CREATE POLICY "Create own community events"
  ON public.community_events
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update own community events"
  ON public.community_events
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Delete own community events"
  ON public.community_events
  FOR DELETE
  USING (auth.uid() = created_by);

-- Attendees: view attendees for an event (public list of ids only).
CREATE POLICY "View community event attendees"
  ON public.community_event_attendees
  FOR SELECT
  USING (true);

-- Users can RSVP/un-RSVP themselves.
CREATE POLICY "Users RSVP themselves"
  ON public.community_event_attendees
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own RSVP"
  ON public.community_event_attendees
  FOR DELETE
  USING (auth.uid() = user_id);

