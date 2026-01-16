import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'petreunion_shelter';

function hmacHex(key: string, message: string): string {
  return crypto.createHmac('sha256', key).update(message).digest('hex');
}

function getShelterPasswordCandidates(): string[] {
  const candidates = [
    process.env.PETREUNION_SHELTER_PASSWORD,
    process.env.SHELTER_PASSWORD,
    // Early rollout fallback: allow ADMIN_KEY to act as shelter portal password
    process.env.ADMIN_KEY,
  ]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());

  return Array.from(new Set(candidates));
}

export async function POST(request: NextRequest) {
  const candidates = getShelterPasswordCandidates();
  if (!candidates.length) {
    return NextResponse.redirect(new URL('/shelter/login?error=Shelter+password+not+configured', request.url), 303);
  }

  const form = await request.formData();
  const password = String(form.get('password') || '').trim();
  const nextPath = String(form.get('next') || '/shelter/dashboard');

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
    return NextResponse.redirect(new URL('/shelter/login?error=Invalid+password', request.url), 303);
  }

  const token = hmacHex(matchedSecret, 'petreunion-shelter');
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

  return response;
}

