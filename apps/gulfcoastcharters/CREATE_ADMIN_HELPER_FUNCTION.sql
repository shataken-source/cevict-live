-- Create helper function for RLS policies to check admin status
-- This function can be used in RLS policies: USING (public.is_current_user_admin())

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((
    SELECT p.is_admin
    FROM public.profiles p
    WHERE p.id = auth.uid()
  ), false)
$$;

-- Revoke execute from anon (only authenticated users can use)
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM anon;

-- Grant to authenticated role
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- Example: Use in RLS policy
-- CREATE POLICY "Admins can read debug_logs"
-- ON public.debug_logs
-- FOR SELECT
-- TO authenticated
-- USING (public.is_current_user_admin());
