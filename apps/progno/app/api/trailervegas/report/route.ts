/**
 * GET /api/trailervegas/report?session_id=cs_xxx
 *
 * Public endpoint — fetches a completed grading report by Stripe session ID.
 * No auth needed; the session_id acts as a bearer token (unguessable).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Invalid session_id' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Check for completed report
  const { data: report } = await supabase
    .from('trailervegas_reports')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (report) {
    return NextResponse.json({
      status: 'complete',
      report: JSON.parse(report.report),
      email: report.email,
      pick_count: report.pick_count,
      amount_paid: report.amount_paid,
      created_at: report.created_at,
    })
  }

  // Check if pending (payment received but not yet processed)
  const { data: pending } = await supabase
    .from('trailervegas_pending')
    .select('status, pick_count')
    .eq('session_id', sessionId)
    .single()

  if (pending) {
    return NextResponse.json({
      status: pending.status === 'completed' ? 'processing' : 'pending',
      pick_count: pending.pick_count,
      message: pending.status === 'completed'
        ? 'Report is being generated, please refresh in a moment.'
        : 'Payment is being processed. Report will be available shortly after payment confirms.',
    })
  }

  return NextResponse.json({ error: 'Report not found' }, { status: 404 })
}
