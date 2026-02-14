-- Notifications, saved searches, recommendations, availability, destination content, audit log

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. Notification templates & queue
-- ============================================

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,              -- e.g. booking_confirmation, anniversary_offer
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  language VARCHAR(5) NOT NULL,   -- en, es, fr, pt, etc.
  subject TEXT,
  body TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_templates_key_lang_channel
  ON public.notification_templates(key, language, channel);

CREATE TABLE IF NOT EXISTS public.notifications_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.shared_users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  template_key TEXT NOT NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  payload JSONB NOT NULL DEFAULT '{}',        -- merged into template
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_queue_status_time
  ON public.notifications_queue(status, scheduled_for);

CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.shared_users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- e.g. 'booking_created', 'anniversary_reminder_sent'
  notification_id UUID REFERENCES public.notifications_queue(id),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_user
  ON public.notification_events(user_id, created_at DESC);

-- ============================================
-- 2. Saved searches & alerts
-- ============================================

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.shared_users(id) ON DELETE CASCADE,
  name TEXT,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE SET NULL,
  filters JSONB NOT NULL DEFAULT '{}', -- { price_min, price_max, bedrooms, property_type, dates, etc. }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user
  ON public.saved_searches(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.search_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id UUID NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  last_run_at TIMESTAMPTZ,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_alerts_saved_search
  ON public.search_alerts(saved_search_id);

-- ============================================
-- 3. Availability calendar for rentals
-- ============================================

CREATE TABLE IF NOT EXISTS public.rental_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  nightly_rate_override DECIMAL(10, 2),
  source TEXT, -- e.g. 'wtv_manual', 'gcc_sync', 'pms_import'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_availability_unique
  ON public.rental_availability(rental_id, date);

CREATE INDEX IF NOT EXISTS idx_rental_availability_range
  ON public.rental_availability(rental_id, date);

-- ============================================
-- 4. Destination content (CMS-lite)
-- ============================================

CREATE TABLE IF NOT EXISTS public.destination_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  slug TEXT NOT NULL, -- e.g. 'guide', 'with-kids', 'fishing'
  title TEXT NOT NULL,
  body_md TEXT NOT NULL, -- markdown
  last_published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_destination_content_unique
  ON public.destination_content(destination_id, language, slug);

-- ============================================
-- 5. Audit log & event stream
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.shared_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. 'sso_validate', 'booking_checkout_created', 'unified_bundle_linked'
  ip INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON public.audit_log(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.shared_users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- e.g. 'viewed_rental', 'added_to_trip', 'finn_conversation', 'guys_trip_mentioned'
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_type
  ON public.user_events(user_id, event_type, created_at DESC);

