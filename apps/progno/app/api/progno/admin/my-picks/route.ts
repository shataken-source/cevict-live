/**
 * My Picks API — save/list/grade manual picks from the admin LIVE ODDS tab.
 * Table: my_picks (auto-created on first POST if missing).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest, bodySecret?: string): boolean {
  const SECRET = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || ''
  if (!SECRET) return false
  const auth = request.headers.get('authorization') || ''
  const headerSecret = request.headers.get('x-admin-secret') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : headerSecret
  return [token, bodySecret].filter(Boolean).some(t => t === SECRET)
}

function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase credentials')
  return createClient(url, key)
}

async function ensureTable(sb: any): Promise<boolean> {
  // Quick probe — if table exists this returns 200
  const { error } = await sb.from('my_picks').select('id').limit(1)
  if (!error) return true
  console.warn('[my-picks] Table my_picks does not exist. Run the migration SQL in Supabase dashboard.')
  return false
}

// GET — list picks for a date (or all pending)
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const sb = getSb()
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const status = searchParams.get('status') // 'pending', 'win', 'lose', or null for all

  let query = sb.from('my_picks').select('*').order('created_at', { ascending: false })
  if (date) query = query.eq('game_date', date)
  if (status) query = query.eq('status', status)
  query = query.limit(200)

  const { data, error } = await query
  if (error) {
    // Table might not exist
    if (error.code === 'PGRST205' || error.message?.includes('my_picks')) {
      return NextResponse.json({ success: true, picks: [], tableExists: false })
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, picks: data || [] })
}

// POST — save new manual picks
export async function POST(request: NextRequest) {
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }) }

  if (!isAuthorized(request, body?.secret)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const sb = getSb()
  await ensureTable(sb)

  const picks: any[] = body.picks
  if (!Array.isArray(picks) || picks.length === 0) {
    return NextResponse.json({ success: false, error: 'No picks provided' }, { status: 400 })
  }

  const rows = picks.map(p => ({
    game_date: p.game_date,
    sport: p.sport,
    league: p.league,
    home_team: p.home_team,
    away_team: p.away_team,
    pick: p.pick,
    is_home_pick: p.is_home_pick,
    odds: p.odds ?? null,
    commence_time: p.commence_time ?? null,
    notes: p.notes ?? null,
    status: 'pending',
  }))

  const { data, error } = await sb
    .from('my_picks')
    .upsert(rows, { onConflict: 'game_date,home_team,away_team' })
    .select()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, saved: data?.length ?? 0, picks: data })
}

// DELETE — remove a pick by id
export async function DELETE(request: NextRequest) {
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }) }

  if (!isAuthorized(request, body?.secret)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const sb = getSb()
  const id = body.id
  if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })

  const { error } = await sb.from('my_picks').delete().eq('id', id)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
