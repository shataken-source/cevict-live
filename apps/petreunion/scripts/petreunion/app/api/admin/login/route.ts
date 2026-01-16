import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'petreunion_admin';

function hmacHex(key: string, message: string): string {
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

export async function POST(request: NextRequest) {
  // Support both env var names for backward compatibility
  const adminPassword = process.env.PETREUNION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('❌ Admin password not configured. Check PETREUNION_ADMIN_PASSWORD or ADMIN_PASSWORD env var.');
    return NextResponse.redirect(new URL('/admin/login?error=Admin+password+not+configured', request.url));
  }

  const form = await request.formData();
  const password = String(form.get('password') || '').trim();
  const nextPath = String(form.get('next') || '/admin');

  // Trim the admin password from env (in case it has whitespace)
  const trimmedAdminPassword = adminPassword.trim();

  // Use timing-safe comparison
  let ok = false;
  try {
    const expected = Buffer.from(trimmedAdminPassword, 'utf8');
    const actual = Buffer.from(password, 'utf8');

    // timingSafeEqual requires buffers of the same length
    if (expected.length === actual.length) {
      ok = crypto.timingSafeEqual(expected, actual);
    }
  } catch (error) {
    console.error('❌ Error comparing passwords:', error);
    ok = false;
  }

  // Fallback to simple string comparison if timingSafeEqual fails (for debugging)
  if (!ok && trimmedAdminPassword === password) {
    console.warn('⚠️ Password match found but timingSafeEqual failed. Using fallback comparison.');
    ok = true;
  }

  if (!ok) {
    console.error('❌ Invalid password attempt. Expected length:', trimmedAdminPassword.length, 'Actual length:', password.length);
    return NextResponse.redirect(new URL('/admin/login?error=Invalid+password', request.url));
  }

  const token = hmacHex(trimmedAdminPassword, 'petreunion-admin');
  const response = NextResponse.redirect(new URL(nextPath, request.url));

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
