# Automated Charter Scraper Setup Guide

## Overview
This guide explains how to set up automated scraping for charter boat companies using Supabase Cron Jobs.

## Prerequisites
- Supabase project with Edge Functions enabled
- Admin access to Supabase dashboard
- **enhanced-smart-scraper** edge function deployed (does the actual scraping)
- **scraper-scheduler** edge function deployed (reads URLs, calls scraper, persists results)

---

## Setup Instructions

### 1. Create Scraper URLs Table
The table is created by migration **`supabase/migrations/20260210_scraper_urls.sql`**. Apply it, or run manually:

```sql
CREATE TABLE scraper_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  priority INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  last_scraped TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Then add URLs to scrape (e.g. via SQL or an admin UI):

```sql
INSERT INTO scraper_urls (url, name, category, priority)
VALUES
  ('https://example.com/charters', 'Example Charters', 'gulf', 5);
```

### 2. Deploy Scraper Scheduler Function
- **Function:** `supabase/functions/scraper-scheduler/index.ts`
- **Deploy:** `supabase functions deploy scraper-scheduler`
- **Behavior:** Reads active rows from `scraper_urls` (by priority), calls **enhanced-smart-scraper** with `mode: 'manual_url'` and `url`, persists returned boat to `scraped_boats`, updates `last_scraped`. Waits 2 seconds between requests.

### 3. Set Up Cron Job
In Supabase Dashboard → Database → Extensions: enable **pg_cron** and **pg_net** if available. Then in SQL (Cron Jobs or a migration):

```sql
-- Run scraper every Monday at 2 AM UTC
SELECT cron.schedule(
  'weekly-charter-scraper',
  '0 2 * * 1',
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/scraper-scheduler',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

Replace `YOUR_SUPABASE_URL` and `YOUR_SERVICE_ROLE_KEY` with your project values. If your project uses a different cron/HTTP API, follow its docs.

### 4. Manual Trigger
To run the scheduler manually:

```bash
curl -X POST YOUR_SUPABASE_URL/functions/v1/scraper-scheduler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

---

## What’s in the Repo (No-BS)

| Piece | Location | Notes |
|-------|----------|--------|
| **scraper_urls** | Migration `20260210_scraper_urls.sql` | Table for URLs; RLS admin-only. |
| **scraper-scheduler** | `supabase/functions/scraper-scheduler/index.ts` | Cron target; calls enhanced-smart-scraper per URL, writes to scraped_boats. |
| **enhanced-smart-scraper** | `supabase/functions/enhanced-smart-scraper/index.ts` | Does the scrape; supports `mode: 'manual_url'`, `url`. |
| **Admin Scraper UI** | `/admin/scraper` (or scraper tab) | Manual runs and config; uses enhanced-smart-scraper (sources/config), not scraper_urls. |

Cron syntax and availability depend on your Supabase plan (pg_cron + pg_net). If cron isn’t available, run the manual `curl` on a schedule from your own cron or CI.

---

## Features
- Automated weekly (or custom schedule) scraping via cron
- Priority-based URL processing (`scraper_urls.priority`)
- Rate limiting (2 seconds between requests)
- Error handling and logging (function logs; optional scraper_logs)
- Deduplication (upsert by `source_url` in scraped_boats)
- Email notifications: not implemented in scheduler; add in your app or a separate job if needed.

---

## Monitoring
- **Scraper history:** Admin Dashboard → Scraper tab (manual runs, logs).
- **scraper_urls:** Check `last_scraped` to see when each URL was last run.
- **scraped_boats:** New/updated rows from scheduler runs.

---

*Last updated: February 2026*
