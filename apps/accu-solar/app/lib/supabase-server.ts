import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

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

/**
 * Get Supabase client for authenticated user requests.
 * Uses the anon key and extracts user from JWT in Authorization header.
 */
export function getSupabaseAuthClient(): SupabaseClient {
  const url = mustGet("SUPABASE_URL");
  const anonKey = mustGet("SUPABASE_ANON_KEY");
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Extract and verify user from request Authorization header.
 * Returns null if no valid token or user not found.
 */
export async function getUserFromRequest(
  request: NextRequest
): Promise<User | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  if (!token) return null;

  const supabase = getSupabaseAuthClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return null;
  }

  return data.user;
}
