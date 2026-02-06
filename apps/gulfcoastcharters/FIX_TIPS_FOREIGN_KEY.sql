-- Fix tips table foreign key
-- The tips table references bookings(booking_id) but bookings only has 'id'
-- This causes foreign key constraint failures

-- Drop the old foreign key constraint
ALTER TABLE public.tips 
DROP CONSTRAINT IF EXISTS tips_booking_id_fkey;

-- Add new foreign key constraint pointing to bookings(id)
ALTER TABLE public.tips
ADD CONSTRAINT tips_booking_id_fkey 
FOREIGN KEY (booking_id) 
REFERENCES public.bookings(id) 
ON DELETE CASCADE;

-- Verify the fix
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
WHERE tc.table_name = 'tips' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'booking_id';
