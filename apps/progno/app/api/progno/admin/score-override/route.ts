/**
 * Add a manual score override for grading. When daily-results runs for that date,
 * it merges these overrides so the pick can be graded (e.g. Montréal 6, Washington 2).
 * POST { secret, date, home_team, away_team, home_score, away_score, league }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(secret: string | undefined): boolean {
  if (!secret?.trim()) return false
  const cronSecret = process.env.CRON_SECRET
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  return (
    (cronSecret && secret.trim() === cronSecret) ||
    (adminPassword && secret.trim() === adminPassword)
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { secret, date, home_team, away_team, home_score, away_score, league } = body as {
      secret?: string
      date?: string
      home_team?: string
      away_team?: string
      home_score?: number
      away_score?: number
      league?: string
    }

    if (!isAuthorized(secret)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing secret' }, { status: 401 })
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: 'date required (YYYY-MM-DD)' }, { status: 400 })
    }
    if (!home_team?.trim() || !away_team?.trim()) {
      return NextResponse.json({ success: false, error: 'home_team and away_team required' }, { status: 400 })
    }
    if (typeof home_score !== 'number' || typeof away_score !== 'number') {
      return NextResponse.json({ success: false, error: 'home_score and away_score required (numbers)' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const fileName = `score-overrides-${date}.json`

    let overrides: { home_team: string; away_team: string; home_score: number; away_score: number; league: string }[] = []
    try {
      const { data: existing } = await supabase.storage.from('predictions').download(fileName)
      if (existing) {
        const text = await existing.text()
        const parsed = JSON.parse(text) as { overrides?: typeof overrides }
        overrides = parsed?.overrides ?? []
      }
    } catch { /* no file yet */ }

    overrides.push({
      home_team: home_team.trim(),
      away_team: away_team.trim(),
      home_score,
      away_score,
      league: (league || 'NHL').trim().toUpperCase(),
    })

    const { error: uploadErr } = await supabase.storage
      .from('predictions')
      .upload(fileName, Buffer.from(JSON.stringify({ overrides }, null, 2), 'utf8'), {
        contentType: 'application/json',
        upsert: true,
      })

    if (uploadErr) {
      console.error('[score-override]', uploadErr.message)
      return NextResponse.json({ success: false, error: uploadErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Override added: ${home_team} ${home_score}-${away_score} ${away_team}. Run GRADE ${date} to apply.`,
      date,
      overridesCount: overrides.length,
    })
  } catch (e: any) {
    console.error('[score-override]', e?.message)
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}
