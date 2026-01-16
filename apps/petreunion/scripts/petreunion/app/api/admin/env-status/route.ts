import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'petreunion_admin';

function isAuthed(request: NextRequest): boolean {
  // Support both env var names for backward compatibility
  const adminPassword = process.env.PETREUNION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const expected = crypto.createHmac('sha256', adminPassword).update('petreunion-admin').digest('hex');
  return token === expected;
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isSet = (v: string | undefined) => Boolean(v && String(v).trim().length > 0);

  return NextResponse.json({
    ok: true,
    env: {
      NEXT_PUBLIC_SITE_URL: isSet(process.env.NEXT_PUBLIC_SITE_URL),
      NEXT_PUBLIC_SUPABASE_URL: isSet(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: isSet(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: isSet(process.env.SUPABASE_SERVICE_ROLE_KEY),
      PETREUNION_ADMIN_PASSWORD: isSet(process.env.PETREUNION_ADMIN_PASSWORD),
    },
  });
}
