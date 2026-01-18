import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  const adminPassword = process.env.SMOKERSRIGHTS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const cookie = request.cookies.get('smokersrights_admin')?.value;
  if (!cookie) return false;

  const expected = await hmacHex(adminPassword, 'smokersrights-admin');
  return cookie === expected;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin route protection
  const isAdminPath = pathname.startsWith('/admin');
  const isAdminApiPath = pathname.startsWith('/api/admin');

  if (isAdminPath || isAdminApiPath) {
    // Allow login page and auth endpoint
    if (pathname === '/admin/login' || pathname === '/api/admin/auth') {
      return NextResponse.next();
    }

    const authed = await isAuthed(req);
    if (authed) {
      return NextResponse.next();
    }

    // For API routes, return 401
    if (isAdminApiPath) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For page routes, redirect to login
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/shop/:path*", "/marketplace/:path*", "/admin/:path*", "/api/admin/:path*"]
};
