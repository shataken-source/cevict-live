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

  // ── Load picks from storage bucket (primary) or picks table (fallback) ──
  // The daily-predictions cron saves JSON files like predictions-YYYY-MM-DD.json
  // to the 'predictions' storage bucket. The picks table may also have data.
  interface RawPick {
    home_team: string
    away_team: string
    pick: string
    sport: string
    league?: string
    confidence?: number
    odds?: number
    pick_type?: string
    recommended_line?: number
    game_date?: string
  }

  const allPicks: RawPick[] = []

  // Try storage bucket first — iterate each date in range
  const dateList: string[] = []
  const cursor = new Date(startStr + 'T12:00:00Z')
  const endDate = new Date(endStr + 'T12:00:00Z')
  while (cursor <= endDate) {
    dateList.push(cursor.toISOString().split('T')[0])
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const d of dateList) {
    try {
      const { data: blob, error } = await supabase.storage
        .from('predictions')
        .download(`predictions-${d}.json`)
      if (error || !blob) continue
      const raw = await blob.text()
      const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
      const payload = JSON.parse(clean)
      const picks = Array.isArray(payload) ? payload : (payload.picks ?? [])
      for (const p of picks) {
        if (p.pick && p.home_team && p.away_team) {
          allPicks.push({
            home_team: p.home_team,
            away_team: p.away_team,
            pick: p.pick,
            sport: (p.sport || 'unknown').toLowerCase(),
            league: p.league || p.sport,
            confidence: typeof p.confidence === 'number' ? p.confidence : undefined,
            odds: p.odds ?? undefined,
            pick_type: p.pick_type || p.recommended_type || 'moneyline',
            recommended_line: p.recommended_line ?? undefined,
            game_date: d,
          })
        }
      }
    } catch { /* file missing or corrupt — skip */ }
  }

  // Fallback: try picks table if storage had nothing
  if (allPicks.length === 0) {
    const { data: tableRows } = await supabase
      .from('picks')
      .select('*')
      .gte('game_date', startStr)
      .lte('game_date', endStr)
    if (tableRows?.length) {
      for (const p of tableRows) {
        allPicks.push({
          home_team: p.home_team,
          away_team: p.away_team,
          pick: p.pick,
          sport: (p.sport || 'unknown').toLowerCase(),
          league: p.league,
          confidence: p.confidence,
          odds: p.odds,
          pick_type: p.pick_type || 'moneyline',
          recommended_line: p.recommended_line,
          game_date: p.game_date,
        })
      }
    }
  }

  // Load outcomes
  const { data: outcomes } = await supabase
    .from('game_outcomes')
    .select('*')
    .gte('game_date', startStr)
    .lte('game_date', endStr)

  if (!allPicks.length || !outcomes?.length) {
    return {
      timestamp: now.toISOString(),
      days,
      totalPicks: allPicks.length,
      totalWR: 0,
      totalROI: 0,
      overallBrier: 1,
      sports: [],
      adjustments: {},
      recommendations: [`Not enough data: ${allPicks.length} picks, ${outcomes?.length ?? 0} outcomes in ${days}-day window.`],
    }
  }

  // ── Grade picks against outcomes ──────────────────────────────────────────
  interface GradedPick {
    sport: string
    confidence: number
    odds: number
    won: boolean
    profit: number
  }

  const graded: GradedPick[] = []

  for (const pred of allPicks) {
    const outcome = outcomes.find(o =>
      teamsMatch(o.home_team, pred.home_team) &&
      teamsMatch(o.away_team, pred.away_team) &&
      (!pred.game_date || o.game_date === pred.game_date)
    )
    if (!outcome || (outcome.home_score + outcome.away_score === 0)) continue

    const homeWon = outcome.home_score > outcome.away_score
    const isTie = outcome.home_score === outcome.away_score
    if (isTie) continue

    const pickedHome = teamsMatch(pred.pick, outcome.home_team)

    // Handle spread picks
    if (pred.pick_type?.toUpperCase() === 'SPREAD' && pred.recommended_line != null) {
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

  // ── GUARDRAILS ──────────────────────────────────────────────────────────
  // These prevent the auto-calibration from going wild:
  //   1. Min 20 picks per sport to adjust floors (noisy below that)
  //   2. Min 25 picks per sport to touch analyzer multipliers
  //   3. Min 30 total graded picks to make ANY adjustments
  //   4. Max 3 floor adjustments per run (won't change every sport at once)
  //   5. Floor step: max +2 up, -1 down per run (asymmetric — raising is safer)
  //   6. Absolute floor bounds: 55-72 (never go above 72 or below 55)
  //   7. Cooldown: if last calibration adjusted config <3 days ago, skip adjustments
  //   8. Never auto-enable analyzer — only auto-disable (recommend-only for enable)
  //   9. PROGNO_MIN_CONFIDENCE is NEVER touched by auto-calibration
  const GUARDRAIL = {
    MIN_PICKS_FLOOR: 20,
    MIN_PICKS_ANALYZER: 25,
    MIN_TOTAL_PICKS: 30,
    MAX_FLOOR_ADJUSTMENTS: 3,
    MAX_FLOOR_RAISE: 2,
    MAX_FLOOR_LOWER: 1,
    FLOOR_CEILING: 72,
    FLOOR_BOTTOM: 55,
    COOLDOWN_DAYS: 3,
    ROI_RAISE_THRESHOLD: -10,
    ROI_LOWER_THRESHOLD: 20,
    GAP_RAISE_THRESHOLD: -10,
    GAP_LOWER_THRESHOLD: 5,
    ANALYZER_DISABLE_ROI: -5,
  }

  const adjustments: Record<string, unknown> = {}
  const recommendations: string[] = []

  // Load current config
  const { data: configRow } = await supabase
    .from('tuning_config')
    .select('config')
    .eq('id', 'default')
    .single()
  const currentConfig = (configRow?.config as Record<string, unknown>) || {}

  // Guardrail: check overall sample size
  if (graded.length < GUARDRAIL.MIN_TOTAL_PICKS) {
    recommendations.push(`⚠️ Only ${graded.length} total graded picks (need ${GUARDRAIL.MIN_TOTAL_PICKS}). Skipping all adjustments.`)
  }

  // Guardrail: cooldown — check if last calibration adjusted config recently
  let cooldownActive = false
  try {
    const { data: lastCal } = await supabase
      .from('calibration_history')
      .select('run_date, adjustments')
      .not('adjustments', 'is', null)
      .order('run_date', { ascending: false })
      .limit(1)
    if (lastCal?.length) {
      const lastRun = new Date(lastCal[0].run_date)
      const daysSince = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < GUARDRAIL.COOLDOWN_DAYS) {
        cooldownActive = true
        recommendations.push(`⚠️ Last calibration adjustment was ${daysSince.toFixed(1)} days ago (cooldown: ${GUARDRAIL.COOLDOWN_DAYS}d). Skipping adjustments — report only.`)
      }
    }
  } catch { /* table might be empty — no cooldown */ }

  const canAdjust = graded.length >= GUARDRAIL.MIN_TOTAL_PICKS && !cooldownActive

  // Adjust league floors based on calibration
  let floorAdjustCount = 0
  for (const sc of sports) {
    const floorKey = 'PROGNO_FLOOR_' + sportToLeague(sc.sport)
    const currentFloor = (typeof currentConfig[floorKey] === 'number'
      ? currentConfig[floorKey]
      : DEFAULT_FLOORS[sportToFloorKey(sc.sport)] ?? DEFAULT_MIN_CONFIDENCE) as number

    if (sc.picks < GUARDRAIL.MIN_PICKS_FLOOR) {
      recommendations.push(`${sportToLeague(sc.sport)}: Only ${sc.picks} picks (need ${GUARDRAIL.MIN_PICKS_FLOOR}) — too few for reliable calibration.`)
      continue
    }

    // Guardrail: max floor adjustments per run
    if (floorAdjustCount >= GUARDRAIL.MAX_FLOOR_ADJUSTMENTS) {
      recommendations.push(`${sportToLeague(sc.sport)}: Already made ${GUARDRAIL.MAX_FLOOR_ADJUSTMENTS} floor changes this run — skipping (WR ${sc.winRate}%, ROI ${sc.roi.toFixed(1)}%).`)
      continue
    }

    // If ROI is very negative, raise the floor (cautiously)
    if (canAdjust && sc.roi < GUARDRAIL.ROI_RAISE_THRESHOLD) {
      const newFloor = Math.min(GUARDRAIL.FLOOR_CEILING, currentFloor + GUARDRAIL.MAX_FLOOR_RAISE)
      if (newFloor !== currentFloor) {
        adjustments[floorKey] = newFloor
        floorAdjustCount++
        recommendations.push(`${sportToLeague(sc.sport)}: ROI ${sc.roi.toFixed(1)}% is very negative. Floor ${currentFloor}→${newFloor}.`)
      }
    }
    // If overconfident by >10pp, raise floor
    else if (canAdjust && sc.gap < GUARDRAIL.GAP_RAISE_THRESHOLD) {
      const newFloor = Math.min(GUARDRAIL.FLOOR_CEILING, currentFloor + GUARDRAIL.MAX_FLOOR_RAISE)
      if (newFloor !== currentFloor) {
        adjustments[floorKey] = newFloor
        floorAdjustCount++
        recommendations.push(`${sportToLeague(sc.sport)}: Overconfident by ${Math.abs(sc.gap).toFixed(1)}pp. Floor ${currentFloor}→${newFloor}.`)
      }
    }
    // If strongly profitable and underconfident, lower floor (very cautiously — only -1)
    else if (canAdjust && sc.roi > GUARDRAIL.ROI_LOWER_THRESHOLD && sc.gap > GUARDRAIL.GAP_LOWER_THRESHOLD && currentFloor > GUARDRAIL.FLOOR_BOTTOM) {
      const newFloor = Math.max(GUARDRAIL.FLOOR_BOTTOM, currentFloor - GUARDRAIL.MAX_FLOOR_LOWER)
      if (newFloor !== currentFloor) {
        adjustments[floorKey] = newFloor
        floorAdjustCount++
        recommendations.push(`${sportToLeague(sc.sport)}: Strong performance (ROI +${sc.roi.toFixed(1)}%, gap +${sc.gap.toFixed(1)}pp). Floor ${currentFloor}→${newFloor}.`)
      }
    }
    // Otherwise keep current
    else {
      recommendations.push(`${sportToLeague(sc.sport)}: Well-calibrated (WR ${sc.winRate}%, conf ${sc.avgConfidence}%, ROI ${sc.roi.toFixed(1)}%). No change.`)
    }
  }

  // Adjust analyzer sport multipliers (only disable, never enable)
  const currentMults = (currentConfig.SPORT_MULTIPLIERS as Record<string, number>) || {
    NBA: 0, NHL: 0, MLB: 1, NCAAB: 0, NCAAF: 1, NFL: 1, NCAA: 0, CBB: 0,
  }
  const newMults = { ...currentMults }

  for (const sc of sports) {
    const league = sportToLeague(sc.sport)
    if (sc.picks < GUARDRAIL.MIN_PICKS_ANALYZER) continue

    // Only auto-DISABLE analyzer, never auto-enable
    if (canAdjust && sc.roi < GUARDRAIL.ANALYZER_DISABLE_ROI && (newMults[league] ?? 0) > 0) {
      newMults[league] = 0
      recommendations.push(`${league}: Negative ROI (${sc.roi.toFixed(1)}%) with analyzer active. Disabling (mult ${currentMults[league]}→0).`)
    }
    // Recommend-only for enabling (human decision)
    else if (sc.roi > 25 && sc.winRate > 60 && (newMults[league] ?? 0) === 0) {
      recommendations.push(`${league}: Strong performance without analyzer. Consider enabling manually (currently off).`)
    }
  }

  if (JSON.stringify(newMults) !== JSON.stringify(currentMults)) {
    adjustments.SPORT_MULTIPLIERS = newMults
  }

  // Merge adjustments into config
  if (Object.keys(adjustments).length > 0 && canAdjust) {
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
  } else if (!canAdjust && Object.keys(adjustments).length > 0) {
    recommendations.push(`ℹ️ Would have made ${Object.keys(adjustments).length} adjustments but guardrails prevented it (report-only mode).`)
    // Clear adjustments so they're not shown as "applied"
    for (const key of Object.keys(adjustments)) delete adjustments[key]
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
