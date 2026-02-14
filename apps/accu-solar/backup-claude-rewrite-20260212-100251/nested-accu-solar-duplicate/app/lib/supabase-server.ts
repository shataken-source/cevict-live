import { createClient } from "@supabase/supabase-js";

function mustGet(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function getSupabaseServerClient() {
  const url = mustGet("SUPABASE_URL");
  const serviceRoleKey = mustGet("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
