import { NextRequest, NextResponse } from 'next/server';

async function hmacHex(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function isAuthed(request: NextRequest): Promise<boolean> {
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('❌ Admin password not configured');
    return false;
  }

  const cookie = request.cookies.get('progno_admin')?.value;
  if (!cookie) {
    return false;
  }

  const expected = await hmacHex(adminPassword.trim(), 'progno-admin');
  return cookie === expected;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes through (backend-only app)
  if (pathname.startsWith('/api')) {
    // Admin API routes still need auth check below
    if (!pathname.startsWith('/api/admin')) {
      return NextResponse.next();
    }
  } else {
    // Block ALL frontend page routes — Progno has no public UI
    return new NextResponse('Not Found', { status: 404 });
  }

  const isAdminApiPath = pathname.startsWith('/api/admin');
  const isAdminPath = false; // frontend admin pages are blocked above

  // Allow login page and auth endpoint
  if (pathname === '/admin/login' || pathname === '/api/admin/auth' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const authed = await isAuthed(request);
  if (authed) {
    return NextResponse.next();
  }

  // For API routes, return 401
  if (isAdminApiPath) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Admin authentication required'
      },
      { status: 401 }
    );
  }

  // For page routes, redirect to login
  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Match everything except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
