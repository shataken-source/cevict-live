/**
 * Auto fine-tune: run Probability Analyzer simulation with 10k (or custom) bootstrap runs.
 * Optionally run 7-day floor sweep. Returns suggested params to apply.
 * Body: { bootstrapRuns?: number, startDate?: string } — startDate not yet used (future: 7-day window from that date).
 */

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 600

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
    const bootstrapRuns = Math.min(50000, Math.max(1000, Number(body.bootstrapRuns) || 10000))

    const cwd = path.join(process.cwd())
    const result = await new Promise<{ code: number | null }>((resolve) => {
      const child = spawn(
        'npx',
        ['tsx', 'scripts/probability-analyzer-simulation.ts', `--runs=${bootstrapRuns}`],
        { cwd, env: process.env, shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
      )
      child.stdout?.on('data', () => {})
      child.stderr?.on('data', () => {})
      child.on('close', (code) => resolve({ code }))
      child.on('error', () => resolve({ code: 1 }))
    })

    if (result.code !== 0) {
      return NextResponse.json({
        success: false,
        error: 'Probability analyzer simulation failed. Check logs and Supabase data.',
      }, { status: 502 })
    }

    const resultsPath = path.join(cwd, 'simulation-results.json')
    let data: any
    try {
      const raw = fs.readFileSync(resultsPath, 'utf8')
      data = JSON.parse(raw)
    } catch {
      return NextResponse.json({
        success: false,
        error: 'simulation-results.json not found or invalid after run.',
      }, { status: 502 })
    }

    const optimal = data.optimalParams || {}
    const suggested = {
      BLEND_WEIGHT: optimal.blendWeight,
      CONFIDENCE_WEIGHT: optimal.confidenceWeight,
      EDGE_WEIGHT: optimal.edgeWeight,
      SPREAD_WEIGHT: optimal.spreadWeight,
      FLIP_THRESHOLD: optimal.flipThreshold,
      SPORT_MULTIPLIERS: optimal.sportMultipliers || {},
    }

    return NextResponse.json({
      success: true,
      bootstrapRuns,
      withAnalyzer: data.withAnalyzer,
      baseline: data.baseline,
      optimalParams: data.optimalParams,
      suggested,
      verdict: data.verdict,
      roiDifference: data.roiDifference,
    })
  } catch (e: any) {
    console.error('[tuning/auto-tune]', e)
    return NextResponse.json({ success: false, error: e?.message || 'Request failed' }, { status: 500 })
  }
}
