# Local Attractions SMS Tips System

## Overview
Automatically sends SMS tips about local attractions to charter guests based on their booking location.

## Features
- Location-specific attraction recommendations
- Automated SMS delivery via Sinch
- Curated tips for Gulf Coast cities
- Scheduled delivery before charter date

## Supported Locations
- Gulf Shores, AL
- Orange Beach, AL
- Destin, FL
- Panama City Beach, FL
- Pensacola, FL

## Usage

### Manual Trigger
```javascript
const { data } = await supabase.functions.invoke('local-attractions-sms', {
  body: {
    bookingId: 'booking123',
    location: 'Gulf Shores',
    userPhone: '+1234567890',
    userName: 'John'
  }
});
```

### Automated Schedule
Set up cron job to send tips 2 days before charter:
```sql
SELECT cron.schedule(
  'send-attraction-tips',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.databasepad.com/functions/v1/local-attractions-sms',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

## Attraction Categories
- State Parks & Beaches
- Entertainment Venues
- Marine Life Attractions
- Golf Courses
- Restaurants & Nightlife

## Best Practices
- Send 1-2 days before charter
- Limit to 1 tip per booking
- Include emoji for visual appeal
- Keep messages under 160 characters
