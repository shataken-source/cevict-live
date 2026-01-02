import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  const adminPassword = process.env.SMOKERSRIGHTS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.redirect(new URL('/admin/login?error=Admin+password+not+configured', request.url));
  }

  const formData = await request.formData();
  const password = formData.get('password') as string;

  if (password === adminPassword) {
    const cookieValue = await hmacHex(adminPassword, 'smokersrights-admin');
    const response = NextResponse.redirect(new URL('/admin', request.url));
    response.cookies.set('smokersrights_admin', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return response;
  }

  await new Promise(r => setTimeout(r, 1000)); // Rate limiting
  return NextResponse.redirect(new URL('/admin/login?error=Invalid+password', request.url));
}

