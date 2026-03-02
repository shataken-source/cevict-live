/**
 * GET: return current tuning config (Supabase + env defaults).
 * POST: save tuning config to Supabase. Body: { config: Record<string, unknown> } or flat key-value.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTuningConfigForAdmin, saveTuningConfig } from '@/app/lib/tuning-config'

export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : (request.headers.get('x-admin-secret') || '')
  if (!token) return false
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  const cronSecret = process.env.CRON_SECRET
  return (adminPassword && token === adminPassword) || (cronSecret && token === cronSecret)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const config = await getTuningConfigForAdmin()
    return NextResponse.json({ success: true, config })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json().catch(() => ({}))
    const config = (body.config && typeof body.config === 'object') ? body.config : body
    const result = await saveTuningConfig(config)
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    return NextResponse.json({ success: true, config })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}
