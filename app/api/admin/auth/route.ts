import { NextRequest, NextResponse } from 'next/server'
import { securityMiddleware } from '@/lib/security-middleware';
export async function POST(request: NextRequest) {
  const sec = await securityMiddleware(request, { rateLimitType: 'admin' });
  if (sec && sec.status !== 200) return sec;

  try {
    const { password } = await request.json()
    if (password === process.env.ADMIN_PASSWORD) return NextResponse.json({ success: true })
    await new Promise(r => setTimeout(r, 1000))
    return NextResponse.json({ error: 'Invalid' }, { status: 401 })
  } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}
