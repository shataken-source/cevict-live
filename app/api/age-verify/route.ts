import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Simple age verification - just set a cookie
  const response = NextResponse.json({ verified: true });

  // Set cookie for 30 days
  response.cookies.set('age_verified', 'yes', {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  return response;
}
