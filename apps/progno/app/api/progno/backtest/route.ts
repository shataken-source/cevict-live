/**
 * Backtest Data API
 * Serves historical prediction results and performance analytics.
 * Monetized via tiered API keys stored in Supabase.
 *
 * Pricing:
 *   Free      — 50 req/day,  last 7 days,  summary only
 *   Starter   — 500 req/day, last 30 days, full pick details       $29/mo
 *   Pro       — 5000 req/day, full history, + ROI analytics        $99/mo
 *   Enterprise— unlimited,    full history, raw data + webhooks    $299/mo
 *
 * Security:
 *   - Uses anon key (RLS-bound) for all Supabase queries, never service-role.
 *   - Rate limits enforced in Supabase (api_usage_quota table) for cross-instance accuracy.
 *   - In-memory counters used as a fast soft guard only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── Pricing / tier configuration ──
interface TierConfig {
  maxRequestsPerDay: number
  historyDays: number
  includeDetails: boolean
  includeAnalytics: boolean
  includeRawData: boolean
  priceMonthly: number
}

const TIER_CONFIGS: Record<string, TierConfig> = {
  free: {
    maxRequestsPerDay: 50,
    historyDays: 7,
    includeDetails: false,
    includeAnalytics: false,
    includeRawData: false,
    priceMonthly: 0,
  },
  starter: {
    maxRequestsPerDay: 500,
    historyDays: 30,
    includeDetails: true,
    includeAnalytics: false,
    includeRawData: false,
    priceMonthly: 29,
  },
  pro: {
    maxRequestsPerDay: 5000,
    historyDays: 365 * 10,
    includeDetails: true,
    includeAnalytics: true,
    includeRawData: false,
    priceMonthly: 99,
  },
  enterprise: {
    maxRequestsPerDay: 100000,
    historyDays: 365 * 10,
    includeDetails: true,
    includeAnalytics: true,
    includeRawData: true,
    priceMonthly: 299,
  },
}

// ── Supabase client — anon key only, relies on RLS ──
function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// ── In-memory soft guard (fast path; NOT source of truth) ──
const softCounters = new Map<string, { count: number; resetAt: number }>()

function softGuardCheck(apiKey: string, maxPerDay: number): boolean {
  const now = Date.now()
  const entry = softCounters.get(apiKey) || { count: 0, resetAt: now + 86400000 }
  if (now >= entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + 86400000
  }
  if (entry.count >= maxPerDay) return false
  entry.count++
  softCounters.set(apiKey, entry)
  return true
}

// ── Supabase-backed rate limit (source of truth) ──
async function checkAndIncrementUsage(
  supabase: ReturnType<typeof createClient>,
  apiKeyHash: string,
  tier: string,
  maxPerDay: number
): Promise<{ allowed: boolean; used: number; remaining: number }> {
  const today = new Date().toISOString().split('T')[0]

  try {
    const { data: existing } = await supabase
      .from('api_usage_quota')
      .select('request_count')
      .eq('api_key_hash', apiKeyHash)
      .eq('date', today)
      .single()

    const currentCount = existing?.request_count || 0

    if (currentCount >= maxPerDay) {
      return { allowed: false, used: currentCount, remaining: 0 }
    }

    if (existing) {
      await supabase
        .from('api_usage_quota')
        .update({ request_count: currentCount + 1, updated_at: new Date().toISOString() })
        .eq('api_key_hash', apiKeyHash)
        .eq('date', today)
    } else {
      await supabase
        .from('api_usage_quota')
        .insert({ api_key_hash: apiKeyHash, date: today, request_count: 1, tier })
    }

    return { allowed: true, used: currentCount + 1, remaining: maxPerDay - currentCount - 1 }
  } catch {
    return { allowed: true, used: 0, remaining: maxPerDay }
  }
}

function hashApiKey(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return 'k_' + Math.abs(hash).toString(36)
}

function extractApiKey(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.nextUrl.searchParams.get('api_key')
}

async function validateApiKey(
  supabase: ReturnType<typeof createClient>,
  key: string
): Promise<{ valid: boolean; tier: string; userId?: string }> {
  if (!supabase) {
    if (key === process.env.CRON_SECRET || key === process.env.ADMIN_PASSWORD) {
      return { valid: true, tier: 'enterprise' }
    }
    return { valid: false, tier: 'free' }
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('tier, user_id, active')
    .eq('key', key)
    .single()

  if (error || !data || !data.active) {
    return { valid: false, tier: 'free' }
  }

  return { valid: true, tier: data.tier || 'free', userId: data.user_id }
}

async function logApiUsage(
  supabase: ReturnType<typeof createClient>,
  apiKeyHash: string,
  tier: string,
  endpoint: string,
  userId?: string
) {
  await supabase.from('api_usage_log').insert({
    api_key_hash: apiKeyHash,
    tier,
    endpoint,
    user_id: userId || null,
    created_at: new Date().toISOString(),
  }).catch(() => {})
}

// ── Data readiness check ──
async function getDataReadiness(supabase: ReturnType<typeof createClient>) {
  const { count } = await supabase
    .from('prediction_results')
    .select('*', { count: 'exact', head: true })

  const totalRows = count || 0
  const estimatedCapacity = 10000
  const percentFull = Math.round((totalRows / estimatedCapacity) * 100)
  return { totalRows, estimatedCapacity, percentFull, ready: percentFull >= 65 }
}

// ── GET /api/progno/backtest ──
export async function GET(req: NextRequest) {
  const apiKey = extractApiKey(req)
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'results'

  // Public endpoints that don't require auth
  if (action === 'pricing') {
    return NextResponse.json({
      tiers: Object.entries(TIER_CONFIGS).map(([name, config]) => ({
        name,
        price: config.priceMonthly === 0 ? 'Free' : `$${config.priceMonthly}/mo`,
        requestsPerDay: config.maxRequestsPerDay,
        historyDays: config.historyDays > 365 ? 'Unlimited' : `${config.historyDays} days`,
        features: [
          config.includeDetails && 'Full pick details (team, odds, confidence, reasoning)',
          config.includeAnalytics && 'ROI analytics, win-rate by sport/tier, streak analysis',
          config.includeRawData && 'Raw JSON export, webhook delivery, bulk download',
        ].filter(Boolean),
      })),
      signup: '/api/progno/backtest?action=register',
    })
  }

  const supabase = getAnonSupabase()

  if (action === 'status') {
    if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const readiness = await getDataReadiness(supabase)
    return NextResponse.json({
      dataReadiness: readiness,
      message: readiness.ready
        ? 'Historical data is available for purchase.'
        : `Data collection in progress (${readiness.percentFull}% of target). API will be fully available at 65%.`,
      availableSports: ['NBA', 'NFL', 'NHL', 'MLB', 'NCAAB', 'NCAAF', 'CBB'],
    })
  }

  // All other endpoints require auth
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key required. Pass via Authorization: Bearer <key> or ?api_key=<key>',
        pricing: '/api/progno/backtest?action=pricing' },
      { status: 401 }
    )
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const auth = await validateApiKey(supabase, apiKey)
  if (!auth.valid) {
    return NextResponse.json({ error: 'Invalid or deactivated API key' }, { status: 403 })
  }

  const tierConfig = TIER_CONFIGS[auth.tier] || TIER_CONFIGS.free
  const keyHash = hashApiKey(apiKey)

  // Fast soft guard (in-memory)
  if (!softGuardCheck(apiKey, tierConfig.maxRequestsPerDay)) {
    return NextResponse.json(
      { error: 'Daily request limit reached', tier: auth.tier, limit: tierConfig.maxRequestsPerDay,
        upgrade: '/api/progno/backtest?action=pricing' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Limit': String(tierConfig.maxRequestsPerDay) } }
    )
  }

  // Authoritative Supabase-backed check
  const usage = await checkAndIncrementUsage(supabase, keyHash, auth.tier, tierConfig.maxRequestsPerDay)
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'Daily request limit reached', tier: auth.tier, limit: tierConfig.maxRequestsPerDay,
        used: usage.used, upgrade: '/api/progno/backtest?action=pricing' },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Limit': String(tierConfig.maxRequestsPerDay) } }
    )
  }

  await logApiUsage(supabase, keyHash, auth.tier, action, auth.userId)

  const headers = {
    'X-RateLimit-Remaining': String(usage.remaining),
    'X-RateLimit-Limit': String(tierConfig.maxRequestsPerDay),
    'X-Tier': auth.tier,
  }

  // ── action: results — historical prediction results ──
  if (action === 'results') {
    const sport = searchParams.get('sport')
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to') || new Date().toISOString().split('T')[0]
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), tierConfig.includeRawData ? 5000 : 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    const minDate = new Date()
    minDate.setDate(minDate.getDate() - tierConfig.historyDays)
    const effectiveFrom = dateFrom && new Date(dateFrom) > minDate
      ? dateFrom
      : minDate.toISOString().split('T')[0]

    let query = supabase
      .from('prediction_results')
      .select('*', { count: 'exact' })
      .gte('date', effectiveFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (sport) query = query.eq('sport', sport.toUpperCase())
    if (status) query = query.eq('status', status)

    const { data, count, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Query failed', details: error.message }, { status: 500 })
    }

    const rows = (data || []).map((r: any) => {
      const base: any = {
        date: r.date,
        home_team: r.home_team,
        away_team: r.away_team,
        pick: r.pick,
        status: r.status,
        sport: r.sport,
      }
      if (tierConfig.includeDetails) {
        base.confidence = r.confidence
        base.actual_winner = r.actual_winner
        base.actual_home_score = r.actual_home_score
        base.actual_away_score = r.actual_away_score
        base.game_id = r.game_id
      }
      return base
    })

    return NextResponse.json({ results: rows, total: count, offset, limit, dateRange: { from: effectiveFrom, to: dateTo } }, { headers })
  }

  // ── action: summary — daily summaries ──
  if (action === 'summary') {
    const days = Math.min(parseInt(searchParams.get('days') || '30'), tierConfig.historyDays)
    const minDate = new Date()
    minDate.setDate(minDate.getDate() - days)

    const { data, error } = await supabase
      .from('prediction_daily_summary')
      .select('*')
      .gte('date', minDate.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    return NextResponse.json({ summaries: data, days }, { headers })
  }

  // ── action: analytics — ROI and performance analytics (Pro+) ──
  if (action === 'analytics') {
    if (!tierConfig.includeAnalytics) {
      return NextResponse.json(
        { error: 'Analytics requires Pro tier or above', upgrade: '/api/progno/backtest?action=pricing' },
        { status: 403 }
      )
    }

    const sport = searchParams.get('sport')
    const days = Math.min(parseInt(searchParams.get('days') || '90'), tierConfig.historyDays)
    const minDate = new Date()
    minDate.setDate(minDate.getDate() - days)
    const minDateStr = minDate.toISOString().split('T')[0]

    let query = supabase
      .from('prediction_results')
      .select('date, sport, status, confidence')
      .gte('date', minDateStr)
      .in('status', ['win', 'lose'])

    if (sport) query = query.eq('sport', sport.toUpperCase())

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    const picks = data || []
    const total = picks.length
    const wins = picks.filter((p: any) => p.status === 'win').length
    const winRate = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0

    const bySport: Record<string, { total: number; wins: number; winRate: number }> = {}
    for (const p of picks) {
      const s = (p as any).sport || 'unknown'
      if (!bySport[s]) bySport[s] = { total: 0, wins: 0, winRate: 0 }
      bySport[s].total++
      if ((p as any).status === 'win') bySport[s].wins++
    }
    for (const s of Object.keys(bySport)) {
      bySport[s].winRate = Math.round((bySport[s].wins / bySport[s].total) * 1000) / 10
    }

    const byConfidence: Record<string, { total: number; wins: number; winRate: number }> = {}
    const buckets = ['30-50', '50-65', '65-80', '80-90', '90-100']
    for (const b of buckets) byConfidence[b] = { total: 0, wins: 0, winRate: 0 }
    for (const p of picks) {
      const c = (p as any).confidence || 0
      let bucket = '30-50'
      if (c >= 90) bucket = '90-100'
      else if (c >= 80) bucket = '80-90'
      else if (c >= 65) bucket = '65-80'
      else if (c >= 50) bucket = '50-65'
      byConfidence[bucket].total++
      if ((p as any).status === 'win') byConfidence[bucket].wins++
    }
    for (const b of Object.keys(byConfidence)) {
      const bc = byConfidence[b]
      bc.winRate = bc.total > 0 ? Math.round((bc.wins / bc.total) * 1000) / 10 : 0
    }

    const sortedByDate = [...picks].sort((a: any, b: any) => a.date.localeCompare(b.date))
    let currentStreak = 0
    let maxWinStreak = 0
    let maxLoseStreak = 0
    let streakType: 'win' | 'lose' | null = null
    for (const p of sortedByDate) {
      if ((p as any).status === streakType) {
        currentStreak++
      } else {
        if (streakType === 'win') maxWinStreak = Math.max(maxWinStreak, currentStreak)
        if (streakType === 'lose') maxLoseStreak = Math.max(maxLoseStreak, currentStreak)
        streakType = (p as any).status
        currentStreak = 1
      }
    }
    if (streakType === 'win') maxWinStreak = Math.max(maxWinStreak, currentStreak)
    if (streakType === 'lose') maxLoseStreak = Math.max(maxLoseStreak, currentStreak)

    return NextResponse.json({
      analytics: {
        overall: { total, wins, losses: total - wins, winRate },
        bySport,
        byConfidence,
        streaks: { maxWinStreak, maxLoseStreak },
        period: { days, from: minDateStr, to: new Date().toISOString().split('T')[0] },
      },
    }, { headers })
  }

  return NextResponse.json({ error: `Unknown action: ${action}`, actions: ['results', 'summary', 'analytics', 'pricing', 'status'] }, { status: 400 })
}
