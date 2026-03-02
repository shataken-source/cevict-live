/**
 * POST: Run the learning bot (analyze recent prediction_results, suggest floor/min-confidence changes).
 * Body: { days?: number, autoApply?: boolean }. Auth: Bearer or x-admin-secret.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runLearningBot } from '@/app/lib/learning-bot'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : (request.headers.get('x-admin-secret') || '')
  if (!token) return false
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  const cronSecret = process.env.CRON_SECRET
  return (adminPassword && token === adminPassword) || (cronSecret && token === cronSecret)
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json().catch(() => ({}))
    const days = typeof body.days === 'number' ? body.days : 7
    const autoApply = body.autoApply === true
    const result = await runLearningBot({ days, autoApply })
    return NextResponse.json({
      success: result.success,
      suggested: result.suggested,
      summary: result.summary,
      applied: result.applied ?? false,
      error: result.error,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? 'Learning bot failed' }, { status: 500 })
  }
}
