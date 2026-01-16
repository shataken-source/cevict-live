import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'petreunion_admin';

export async function POST(request: NextRequest) {
  // 303 so POST logout becomes GET on redirect
  const response = NextResponse.redirect(new URL('/admin/login', request.url), 303);
  const isHttps = new URL(request.url).protocol === 'https:';
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
