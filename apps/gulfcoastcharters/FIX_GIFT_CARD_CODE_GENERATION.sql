-- Fix gift certificate code generation RPC function
-- The function exists but needs proper permissions to be callable via Supabase RPC

-- Grant execute permission to service_role (for Edge Functions)
GRANT EXECUTE ON FUNCTION public.generate_gift_certificate_code() TO service_role;

-- Grant execute permission to anon (if needed for client-side calls)
GRANT EXECUTE ON FUNCTION public.generate_gift_certificate_code() TO anon;

-- Grant execute permission to authenticated users (if needed)
GRANT EXECUTE ON FUNCTION public.generate_gift_certificate_code() TO authenticated;

-- Verify the function exists and is accessible
SELECT 
  routine_name,
  routine_schema,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'generate_gift_certificate_code';
