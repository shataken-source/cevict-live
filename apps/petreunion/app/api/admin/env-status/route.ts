import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  if (!isAdminAuthed(request)) {
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
