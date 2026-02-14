import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    // Default password for development - remove in production
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    if (password === adminPassword) return NextResponse.json({ success: true })
    await new Promise(r => setTimeout(r, 1000))
    return NextResponse.json({ error: 'Invalid' }, { status: 401 })
  } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}
