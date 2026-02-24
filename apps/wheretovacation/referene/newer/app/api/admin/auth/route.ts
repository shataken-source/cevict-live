import { NextRequest, NextResponse } from 'next/server'
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    if (password === process.env.ADMIN_PASSWORD) return NextResponse.json({ success: true })
    await new Promise(r => setTimeout(r, 1000))
    return NextResponse.json({ error: 'Invalid' }, { status: 401 })
  } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}
