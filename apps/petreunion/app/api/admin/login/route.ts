import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminPasswordCandidates } from '@/lib/admin-password';

const COOKIE_NAME = 'petreunion_admin';

function hmacHex(key: string, message: string): string {
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

export async function POST(request: NextRequest) {
  const candidates = getAdminPasswordCandidates();
  if (!candidates.length) {
    console.error('❌ Admin password not configured. Check PETREUNION_ADMIN_PASSWORD / ADMIN_PASSWORD / ADMIN_KEY.');
    return NextResponse.redirect(new URL('/admin/login?error=Admin+password+not+configured', request.url));
  }

  const form = await request.formData();
  const password = String(form.get('password') || '').trim();
  const nextPath = String(form.get('next') || '/admin');

  let matchedSecret: string | null = null;
  for (const candidate of candidates) {
    // Use timing-safe comparison when lengths match
    let ok = false;
    try {
      const expected = Buffer.from(candidate, 'utf8');
      const actual = Buffer.from(password, 'utf8');
      if (expected.length === actual.length) ok = crypto.timingSafeEqual(expected, actual);
    } catch {
      ok = false;
    }
    if (!ok && candidate === password) ok = true;

    if (ok) {
      matchedSecret = candidate;
      break;
    }
  }

  if (!matchedSecret) {
    console.error('❌ Invalid password attempt.');
    return NextResponse.redirect(new URL('/admin/login?error=Invalid+password', request.url));
  }

  const token = hmacHex(matchedSecret, 'petreunion-admin');
  // IMPORTANT: use 303 so a POST login becomes a GET to the next page (avoids redirect loops).
  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);

  const isHttps = new URL(request.url).protocol === 'https:';

  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  console.log('✅ Admin login successful');
  return response;
}
