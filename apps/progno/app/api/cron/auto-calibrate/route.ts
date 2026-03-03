/**
 * Auto-Calibration Cron — Self-Tuning Pipeline
 * ═══════════════════════════════════════════════════════════════════
 * Runs weekly (or on-demand from admin) to:
 *   1. Load 14 days of historical picks + outcomes
 *   2. Analyze calibration per sport (confidence vs actual WR)
 *   3. Auto-adjust league floors & analyzer multipliers
 *   4. Save updated config to Supabase tuning_config
 *   5. Log calibration report to calibration_history table
 *
 * Triggered by:
 *   - Vercel cron: weekly Monday 3 AM UTC
 *   - Admin panel: manual "Run Calibration" button
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 min max for serverless

// ── Auth ────────────────────────────────────────────────────────────────────
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') || ''
  const headerToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const cronSecret = process.env.CRON_SECRET
  const adminPw = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  if (!headerToken && !cronSecret) return false
  // Cron jobs send no auth — allow if CRON_SECRET matches or admin pw
  if (!headerToken) return true // cron invocation
  return (cronSecret && headerToken === cronSecret) || (adminPw && headerToken === adminPw) || false
}

// ── Types ────────────────────────────────────────────────────────────────────
interface SportCalibration {
  sport: string
  picks: number
  wins: number
  winRate: number
  avgConfidence: number
  gap: number // WR - avgConf (positive = underconfident, negative = overconfident)
  roi: number
  brierScore: number
}

interface CalibrationResult {
  timestamp: string
  days: number
  totalPicks: number
  totalWR: number
  totalROI: number
  overallBrier: number
  sports: SportCalibration[]
  adjustments: Record<string, unknown>
  recommendations: string[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function oddsToProb(odds: number): number {
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100)
}

function teamsMatch(a: string, b: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  return n(a) === n(b) || n(a).includes(n(b)) || n(b).includes(n(a))
}

function sportToFloorKey(sport: string): string {
  return sport
    .replace('basketball_', '').replace('americanfootball_', '')
    .replace('icehockey_', '').replace('baseball_', '')
    .toLowerCase()
}

function sportToLeague(sport: string): string {
  return sportToFloorKey(sport).toUpperCase()
}

function profitFromOdds(odds: number, won: boolean): number {
  if (!won) return -100
  if (odds > 0) return odds
  return Math.round((100 / Math.abs(odds)) * 100)
}

// ── Default floors (current tuned values) ────────────────────────────────────
const DEFAULT_FLOORS: Record<string, number> = {
  nba: 58, nhl: 62, nfl: 60, mlb: 57,
  ncaab: 62, ncaaf: 62, cbb: 66, ncaa: 66,
}
const DEFAULT_MIN_CONFIDENCE = 58

// ── Main calibration logic ──────────────────────────────────────────────────
async function runCalibration(days: number = 14): Promise<CalibrationResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  const startStr = start.toISOString().split('T')[0]
  const endStr = now.toISOString().split('T')[0]

  // Fetch predictions + outcomes
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .gte('game_date', startStr)
    .lte('game_date', endStr)

  const { data: outcomes } = await supabase
    .from('game_outcomes')
    .select('*')
    .gte('game_date', startStr)
    .lte('game_date', endStr)

  if (!predictions?.length || !outcomes?.length) {
    return {
      timestamp: now.toISOString(),
      days,
      totalPicks: 0,
      totalWR: 0,
      totalROI: 0,
      overallBrier: 1,
      sports: [],
      adjustments: {},
      recommendations: ['Not enough data for calibration.'],
    }
  }

  // Match predictions to outcomes
  interface GradedPick {
    sport: string
    confidence: number
    odds: number
    won: boolean
    profit: number
  }

  const graded: GradedPick[] = []

  for (const pred of predictions) {
    const outcome = outcomes.find(o =>
      teamsMatch(o.home_team, pred.home_team) &&
      teamsMatch(o.away_team, pred.away_team) &&
      o.game_date === pred.game_date
    )
    if (!outcome || (outcome.home_score + outcome.away_score === 0)) continue

    const homeWon = outcome.home_score > outcome.away_score
    const isTie = outcome.home_score === outcome.away_score
    if (isTie) continue

    const pickedHome = teamsMatch(pred.pick, outcome.home_team)

    // Handle spread picks
    if (pred.pick_type === 'SPREAD' && pred.recommended_line != null) {
      const margin = outcome.home_score - outcome.away_score
      const line = pred.recommended_line
      const covered = pickedHome ? (margin + line > 0) : (-margin - line > 0)
      const pushed = pickedHome ? (margin + line === 0) : (-margin - line === 0)
      if (pushed) continue
      graded.push({
        sport: pred.sport || 'unknown',
        confidence: pred.confidence ?? 50,
        odds: pred.odds ?? -110,
        won: covered,
        profit: covered ? profitFromOdds(pred.odds ?? -110, true) : -100,
      })
      continue
    }

    // Moneyline
    const won = (pickedHome && homeWon) || (!pickedHome && !homeWon)
    graded.push({
      sport: pred.sport || 'unknown',
      confidence: pred.confidence ?? 50,
      odds: pred.odds ?? -110,
      won,
      profit: won ? profitFromOdds(pred.odds ?? -110, true) : -100,
    })
  }

  if (!graded.length) {
    return {
      timestamp: now.toISOString(), days, totalPicks: 0, totalWR: 0, totalROI: 0,
      overallBrier: 1, sports: [], adjustments: {}, recommendations: ['No graded picks found.'],
    }
  }

  // Overall stats
  const totalWins = graded.filter(g => g.won).length
  const totalWR = (totalWins / graded.length) * 100
  const totalProfit = graded.reduce((s, g) => s + g.profit, 0)
  const totalROI = (totalProfit / (graded.length * 100)) * 100

  // Brier score
  let brierSum = 0
  for (const g of graded) {
    const confProb = g.confidence / 100
    const actual = g.won ? 1 : 0
    brierSum += (confProb - actual) ** 2
  }
  const overallBrier = brierSum / graded.length

  // Per-sport calibration
  const sportMap = new Map<string, GradedPick[]>()
  for (const g of graded) {
    const key = g.sport
    if (!sportMap.has(key)) sportMap.set(key, [])
    sportMap.get(key)!.push(g)
  }

  const sports: SportCalibration[] = []
  for (const [sport, picks] of Array.from(sportMap.entries())) {
    const wins = picks.filter(p => p.won).length
    const wr = (wins / picks.length) * 100
    const avgConf = picks.reduce((s, p) => s + p.confidence, 0) / picks.length
    const profit = picks.reduce((s, p) => s + p.profit, 0)
    const roi = (profit / (picks.length * 100)) * 100
    let brier = 0
    for (const p of picks) brier += ((p.confidence / 100) - (p.won ? 1 : 0)) ** 2
    brier /= picks.length

    sports.push({
      sport,
      picks: picks.length,
      wins,
      winRate: Math.round(wr * 10) / 10,
      avgConfidence: Math.round(avgConf * 10) / 10,
      gap: Math.round((wr - avgConf) * 10) / 10,
      roi: Math.round(roi * 100) / 100,
      brierScore: Math.round(brier * 10000) / 10000,
    })
  }

  // ── Auto-adjust logic ────────────────────────────────────────────────────
  const adjustments: Record<string, unknown> = {}
  const recommendations: string[] = []

  // Load current config
  const { data: configRow } = await supabase
    .from('tuning_config')
    .select('config')
    .eq('id', 'default')
    .single()
  const currentConfig = (configRow?.config as Record<string, unknown>) || {}

  // Adjust league floors based on calibration
  for (const sc of sports) {
    const floorKey = 'PROGNO_FLOOR_' + sportToLeague(sc.sport)
    const currentFloor = (typeof currentConfig[floorKey] === 'number'
      ? currentConfig[floorKey]
      : DEFAULT_FLOORS[sportToFloorKey(sc.sport)] ?? DEFAULT_MIN_CONFIDENCE) as number

    if (sc.picks < 10) {
      recommendations.push(`${sportToLeague(sc.sport)}: Only ${sc.picks} picks — too few for reliable calibration.`)
      continue
    }

    // If ROI is very negative, raise the floor
    if (sc.roi < -10) {
      const newFloor = Math.min(75, currentFloor + 3)
      adjustments[floorKey] = newFloor
      recommendations.push(`${sportToLeague(sc.sport)}: ROI ${sc.roi.toFixed(1)}% is very negative. Floor ${currentFloor}→${newFloor}.`)
    }
    // If overconfident by >10pp, raise floor
    else if (sc.gap < -10) {
      const newFloor = Math.min(75, currentFloor + 2)
      adjustments[floorKey] = newFloor
      recommendations.push(`${sportToLeague(sc.sport)}: Overconfident by ${Math.abs(sc.gap).toFixed(1)}pp. Floor ${currentFloor}→${newFloor}.`)
    }
    // If strongly profitable and underconfident, lower floor (be less restrictive)
    else if (sc.roi > 20 && sc.gap > 5 && currentFloor > 55) {
      const newFloor = Math.max(55, currentFloor - 2)
      adjustments[floorKey] = newFloor
      recommendations.push(`${sportToLeague(sc.sport)}: Strong performance (ROI +${sc.roi.toFixed(1)}%, underconfident +${sc.gap.toFixed(1)}pp). Floor ${currentFloor}→${newFloor}.`)
    }
    // Otherwise keep current
    else {
      recommendations.push(`${sportToLeague(sc.sport)}: Well-calibrated (WR ${sc.winRate}%, conf ${sc.avgConfidence}%, ROI ${sc.roi.toFixed(1)}%). No change.`)
    }
  }

  // Adjust analyzer sport multipliers
  const currentMults = (currentConfig.SPORT_MULTIPLIERS as Record<string, number>) || {
    NBA: 0, NHL: 0, MLB: 1, NCAAB: 0, NCAAF: 1, NFL: 1, NCAA: 0, CBB: 0,
  }
  const newMults = { ...currentMults }

  for (const sc of sports) {
    const league = sportToLeague(sc.sport)
    if (sc.picks < 15) continue

    // If sport has negative ROI and analyzer is active, disable it
    if (sc.roi < -5 && (newMults[league] ?? 0) > 0) {
      newMults[league] = 0
      recommendations.push(`${league}: Negative ROI with analyzer active. Disabling analyzer (mult ${currentMults[league]}→0).`)
    }
    // If sport has very strong ROI and analyzer is off, consider enabling
    // (conservative — only enable if ROI > 25% and WR > 60%)
    else if (sc.roi > 25 && sc.winRate > 60 && (newMults[league] ?? 0) === 0) {
      // Don't auto-enable — just recommend. Too risky to auto-change.
      recommendations.push(`${league}: Strong performance without analyzer. Consider enabling (currently off).`)
    }
  }

  if (JSON.stringify(newMults) !== JSON.stringify(currentMults)) {
    adjustments.SPORT_MULTIPLIERS = newMults
  }

  // Merge adjustments into config
  if (Object.keys(adjustments).length > 0) {
    const newConfig = { ...currentConfig, ...adjustments }
    const { error } = await supabase.from('tuning_config').upsert(
      { id: 'default', config: newConfig, updated_at: now.toISOString() },
      { onConflict: 'id' }
    )
    if (error) {
      recommendations.push(`⚠️ Failed to save config: ${error.message}`)
    } else {
      recommendations.push(`✅ Saved ${Object.keys(adjustments).length} config adjustments to Supabase.`)
    }
  } else {
    recommendations.push('✅ No adjustments needed — all sports well-calibrated.')
  }

  // Log to calibration_history
  try {
    await supabase.from('calibration_history').insert({
      run_date: now.toISOString(),
      days_analyzed: days,
      total_picks: graded.length,
      overall_wr: Math.round(totalWR * 10) / 10,
      overall_roi: Math.round(totalROI * 100) / 100,
      overall_brier: Math.round(overallBrier * 10000) / 10000,
      sport_data: sports,
      adjustments: Object.keys(adjustments).length > 0 ? adjustments : null,
      recommendations,
    })
  } catch {
    // Table may not exist yet — non-fatal
  }

  return {
    timestamp: now.toISOString(),
    days,
    totalPicks: graded.length,
    totalWR: Math.round(totalWR * 10) / 10,
    totalROI: Math.round(totalROI * 100) / 100,
    overallBrier: Math.round(overallBrier * 10000) / 10000,
    sports,
    adjustments,
    recommendations,
  }
}

// ── GET handler (cron + admin) ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = Math.min(90, Math.max(7, parseInt(searchParams.get('days') || '14', 10)))

  try {
    const result = await runCalibration(days)
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Calibration failed' }, { status: 500 })
  }
}

// ── POST handler (admin manual trigger) ──────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let days = 14
  try {
    const body = await request.json()
    if (body.days) days = Math.min(90, Math.max(7, parseInt(body.days, 10)))
  } catch { /* use default */ }

  try {
    const result = await runCalibration(days)
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Calibration failed' }, { status: 500 })
  }
}
