-- Test Data Seed Script
-- Run this AFTER creating a test user and captain
-- Replace USER_UUID and CAPTAIN_UUID with actual values

-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================
-- 1. Get your user UUID from Supabase Auth
-- 2. Create a captain record linked to your user
-- 3. Replace USER_UUID and CAPTAIN_UUID below
-- 4. Run this script

-- Example queries to get your UUIDs:
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';
-- SELECT id FROM public.captains WHERE user_id = 'YOUR_USER_UUID';

-- ============================================
-- CONFIGURATION (REPLACE THESE)
-- ============================================

-- Set these variables (or replace inline)
-- \set USER_UUID '00000000-0000-0000-0000-000000000000'
-- \set CAPTAIN_UUID '00000000-0000-0000-0000-000000000000'

-- ============================================
-- TEST CALENDAR AVAILABILITY
-- ============================================

-- Insert test availability slots for next 7 days
insert into public.calendar_availability (
  captain_id,
  date,
  time_slot,
  start_time,
  end_time,
  status,
  max_passengers,
  current_passengers,
  price
)
select 
  :CAPTAIN_UUID::uuid as captain_id,
  (current_date + (generate_series || ' days')::interval)::date as date,
  case (generate_series % 3)
    when 0 then 'morning'::time_slot_enum
    when 1 then 'afternoon'::time_slot_enum
    else 'full_day'::time_slot_enum
  end as time_slot,
  case (generate_series % 3)
    when 0 then '06:00:00'::time
    when 1 then '12:00:00'::time
    else '06:00:00'::time
  end as start_time,
  case (generate_series % 3)
    when 0 then '12:00:00'::time
    when 1 then '18:00:00'::time
    else '18:00:00'::time
  end as end_time,
  case (generate_series % 5)
    when 0 then 'available'::availability_status_enum
    when 1 then 'available'::availability_status_enum
    when 2 then 'booked'::availability_status_enum
    when 3 then 'available'::availability_status_enum
    else 'hold'::availability_status_enum
  end as status,
  6 as max_passengers,
  case (generate_series % 5)
    when 2 then 6
    else 0
  end as current_passengers,
  (500 + (random() * 500)::int)::decimal(10,2) as price
from generate_series(0, 6);

-- ============================================
-- TEST RAIN CHECK
-- ============================================

-- Insert a test rain check (if you have a booking_id)
-- insert into public.rain_checks (
--   code,
--   original_booking_id,
--   customer_id,
--   captain_id,
--   value,
--   issued_date,
--   expiration_date,
--   status,
--   cancellation_reason,
--   remaining_balance
-- )
-- values (
--   'RC-2025-TEST01',
--   null, -- Replace with actual booking_id if available
--   :USER_UUID::uuid,
--   :CAPTAIN_UUID::uuid,
--   500.00,
--   now(),
--   (now() + interval '12 months'),
--   'active'::rain_check_status_enum,
--   'Weather cancellation',
--   500.00
-- );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify data was inserted:

-- Check calendar availability
-- SELECT 
--   date,
--   time_slot,
--   status,
--   max_passengers,
--   price
-- FROM public.calendar_availability
-- WHERE captain_id = :CAPTAIN_UUID::uuid
-- ORDER BY date, time_slot;

-- Check table counts
-- SELECT 
--   'calendar_availability' as table_name,
--   count(*) as row_count
-- FROM public.calendar_availability
-- UNION ALL
-- SELECT 'rain_checks', count(*) FROM public.rain_checks
-- UNION ALL
-- SELECT 'tips', count(*) FROM public.tips
-- UNION ALL
-- SELECT 'gift_certificates', count(*) FROM public.gift_certificates
-- UNION ALL
-- SELECT 'review_requests', count(*) FROM public.review_requests
-- UNION ALL
-- SELECT 'waitlist', count(*) FROM public.waitlist
-- UNION ALL
-- SELECT 'booking_holds', count(*) FROM public.booking_holds;
