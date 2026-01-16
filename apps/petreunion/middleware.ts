import { NextRequest, NextResponse } from 'next/server';
import { getAdminPasswordCandidates } from '@/lib/admin-password';

const COOKIE_NAME = 'petreunion_admin';

async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  const bytes = new Uint8Array(signature);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function isAuthed(request: NextRequest): Promise<boolean> {
  const candidates = getAdminPasswordCandidates();
  if (!candidates.length) {
    console.error('❌ Admin password not configured in middleware');
    return false;
  }

  // Allow server-to-server / CLI calls to admin APIs without cookies.
  // NOTE: middleware runs on the Edge runtime, so keep this logic simple (no Node crypto APIs).
  const headerKey = (request.headers.get('x-admin-key') || '').trim();
  if (headerKey) {
    for (const candidate of candidates) {
      if (candidate === headerKey) return true;
    }
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) {
    console.log('❌ No admin cookie found');
    return false;
  }

  let isMatch = false;
  for (const candidate of candidates) {
    const expected = await hmacHex(candidate, 'petreunion-admin');
    if (cookie === expected) {
      isMatch = true;
      break;
    }
  }

  if (!isMatch) {
    console.log('❌ Admin cookie mismatch');
  }

  return isMatch;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath = pathname.startsWith('/admin');
  const isAdminApiPath = pathname.startsWith('/api/admin');

  if (!isAdminPath && !isAdminApiPath) {
    return NextResponse.next();
  }

  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const authed = await isAuthed(request);
  if (authed) {
    return NextResponse.next();
  }

  if (isAdminApiPath) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.searchParams.set('next', pathname);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
