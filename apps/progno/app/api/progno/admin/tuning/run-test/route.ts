/**
 * Run 7-day simulation with optional env overrides; return WR, ROI, graded count.
 * Body: { overrides: Record<string, string | number> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

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
    const overrides = (body.overrides && typeof body.overrides === 'object') ? body.overrides : {}
    const env: Record<string, string> = { ...process.env }
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== undefined && v !== null) env[k] = typeof v === 'object' ? JSON.stringify(v) : String(v)
    }

    const cwd = path.join(process.cwd())
    const result = await new Promise<{ stdout: string; code: number | null }>((resolve) => {
      const child = spawn('npx', ['tsx', 'scripts/run-7day-simulation.ts', '--tune'], { cwd, env, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
      let out = ''
      if (child.stdout) child.stdout.on('data', (d: Buffer) => { out += d.toString() })
      if (child.stderr) child.stderr.on('data', (d: Buffer) => { out += d.toString() })
      child.on('close', (code: number | null) => resolve({ stdout: out, code }))
      child.on('error', () => resolve({ stdout: out, code: 1 }))
    })

    const match = result.stdout.match(/TUNE_RESULT=(.+)/)
    if (!match) {
      return NextResponse.json({
        success: false,
        error: 'Simulation did not return TUNE_RESULT. Check Supabase historical_odds and game_outcomes.',
        log: result.stdout.slice(-2000),
      }, { status: 502 })
    }
    try {
      const tuneResult = JSON.parse(match[1])
      return NextResponse.json({ success: true, ...tuneResult })
    } catch {
      return NextResponse.json({ success: false, error: 'Failed to parse TUNE_RESULT', log: match[1] }, { status: 502 })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    console.error('[tuning/run-test]', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
