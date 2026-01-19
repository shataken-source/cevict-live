# Automated Charter Scraper Setup Guide

## Overview
This guide explains how to set up automated scraping for charter boat companies using Supabase Cron Jobs.

## Prerequisites
- Supabase project with Edge Functions enabled
- Admin access to Supabase dashboard
- Web scraper edge function deployed

## Setup Instructions

### 1. Create Scraper URLs Table
```sql
CREATE TABLE scraper_urls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  priority INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  last_scraped TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Deploy Scraper Scheduler Function
Create `supabase/functions/scraper-scheduler/index.ts` and deploy it.

### 3. Set Up Cron Job
In Supabase Dashboard → Database → Cron Jobs:

```sql
-- Run scraper every Monday at 2 AM UTC
SELECT cron.schedule(
  'weekly-charter-scraper',
  '0 2 * * 1',
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/scraper-scheduler',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

### 4. Manual Trigger
To manually trigger the scraper:
```bash
curl -X POST YOUR_SUPABASE_URL/functions/v1/scraper-scheduler \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Features
- ✅ Automated weekly scraping
- ✅ Priority-based URL processing
- ✅ Rate limiting (2 seconds between requests)
- ✅ Error handling and logging
- ✅ Deduplication logic
- ✅ Email notifications

## Monitoring
Check scraper history in the Admin Dashboard → Scraper tab.
