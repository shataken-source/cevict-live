import { NextResponse } from 'next/server';

function isSet(v: string | undefined) {
  return Boolean(v && String(v).trim().length > 0);
}

function len(v: string | undefined) {
  const s = (v || '').trim();
  return s ? s.length : 0;
}

function looksLikeSupabaseUrl(v: string | undefined) {
  if (!v) return false;
  const s = String(v).trim();
  return /^https:\/\/.+\.supabase\.co\/?$/.test(s);
}

export async function GET() {
  // Safe to expose: booleans only, no values.
  const supabaseUrl = process.env.SUPABASE_URL;
  const nextPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const resolvedSupabaseUrlSource = looksLikeSupabaseUrl(supabaseUrl)
    ? 'SUPABASE_URL'
    : looksLikeSupabaseUrl(nextPublicUrl)
      ? 'NEXT_PUBLIC_SUPABASE_URL'
      : 'NONE';

  return NextResponse.json({
    ok: true,
    env: {
      NEXT_PUBLIC_SITE_URL: isSet(process.env.NEXT_PUBLIC_SITE_URL),
      NEXT_PUBLIC_SUPABASE_URL: isSet(process.env.NEXT_PUBLIC_SUPABASE_URL) || isSet(process.env.SUPABASE_URL),
      SUPABASE_URL_IS_VALID: looksLikeSupabaseUrl(process.env.SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_URL_IS_VALID: looksLikeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
      RESOLVED_SUPABASE_URL_SOURCE: resolvedSupabaseUrlSource,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: isSet(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: isSet(process.env.SUPABASE_SERVICE_ROLE_KEY),
      PETREUNION_ADMIN_PASSWORD: isSet(process.env.PETREUNION_ADMIN_PASSWORD) || isSet(process.env.ADMIN_PASSWORD),
      ADMIN_KEY: isSet(process.env.ADMIN_KEY),
      // Debug-only lengths (no values)
      PETREUNION_ADMIN_PASSWORD_LEN: len(process.env.PETREUNION_ADMIN_PASSWORD),
      ADMIN_PASSWORD_LEN: len(process.env.ADMIN_PASSWORD),
      ADMIN_KEY_LEN: len(process.env.ADMIN_KEY),
      OPENAI_API_KEY: isSet(process.env.OPENAI_API_KEY),
      OPENAI_MODEL: isSet(process.env.OPENAI_MODEL),
      OPENAI_BASE_URL: isSet(process.env.OPENAI_BASE_URL),
    },
  });
}

