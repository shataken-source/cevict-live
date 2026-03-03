/**
 * POST /api/admin/auth
 * Body: { password: string }
 * Verifies against ADMIN_PASSWORD or PROGNO_ADMIN_PASSWORD, sets progno_admin cookie (HMAC hex).
 */

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
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(request: NextRequest) {
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { success: false, error: 'Admin password not configured' },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const pw = (body.password ?? '').trim();
  if (!pw) {
    return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 });
  }

  const expected = await hmacHex(adminPassword.trim(), 'progno-admin');
  const provided = await hmacHex(pw, 'progno-admin');
  if (provided !== expected) {
    return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('progno_admin', expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
