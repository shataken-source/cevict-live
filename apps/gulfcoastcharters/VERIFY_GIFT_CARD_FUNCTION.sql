-- Verify the gift certificate code generation function exists and works

-- Check if function exists
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'generate_gift_certificate_code';

-- Test the function (should return a code like GCC-XXXXXXXX)
SELECT public.generate_gift_certificate_code() as test_code;

-- Check permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'generate_gift_certificate_code';
