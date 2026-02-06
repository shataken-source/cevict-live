-- Create the gift certificate code generation function
-- This function generates a unique gift certificate code

-- Drop function if it exists (to avoid conflicts)
DROP FUNCTION IF EXISTS public.generate_gift_certificate_code();

-- Function to generate unique gift certificate code
CREATE FUNCTION public.generate_gift_certificate_code()
RETURNS text AS $$
DECLARE
  new_code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate code: GCC- followed by 8 uppercase hex characters
    new_code := 'GCC-' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.gift_certificates WHERE code = new_code) INTO exists_check;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service_role (for Edge Functions)
GRANT EXECUTE ON FUNCTION public.generate_gift_certificate_code() TO service_role;

-- Grant execute permission to anon (if needed for client-side calls)
GRANT EXECUTE ON FUNCTION public.generate_gift_certificate_code() TO anon;

-- Grant execute permission to authenticated users (if needed)
GRANT EXECUTE ON FUNCTION public.generate_gift_certificate_code() TO authenticated;

-- Verify the function was created
SELECT 
  routine_name,
  routine_schema,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'generate_gift_certificate_code';
