-- Fix review_requests table foreign key
-- The review_requests table references bookings(booking_id) but bookings uses 'id' as PK
-- This may cause foreign key constraint failures

-- Check current foreign key
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'review_requests' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'booking_id';

-- If the foreign key points to bookings(booking_id) instead of bookings(id), fix it:
-- (Uncomment and run if needed)

-- ALTER TABLE public.review_requests 
-- DROP CONSTRAINT IF EXISTS review_requests_booking_id_fkey;

-- ALTER TABLE public.review_requests
-- ADD CONSTRAINT review_requests_booking_id_fkey 
-- FOREIGN KEY (booking_id) 
-- REFERENCES public.bookings(id) 
-- ON DELETE CASCADE;
