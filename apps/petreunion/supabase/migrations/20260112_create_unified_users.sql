-- Minimal unified_users table to satisfy RLS policy references
CREATE TABLE IF NOT EXISTS public.unified_users (
  id uuid PRIMARY KEY,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.unified_users IS 'Lightweight user role map used by RLS policies';
COMMENT ON COLUMN public.unified_users.role IS 'user | admin';

-- Optional convenience index
CREATE INDEX IF NOT EXISTS idx_unified_users_role ON public.unified_users(role);
