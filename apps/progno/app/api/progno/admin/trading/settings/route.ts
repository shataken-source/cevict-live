import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SETTINGS_DIR = path.join(process.cwd(), '.progno')
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'trading-settings.json')

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ')
    ? auth.slice(7).trim()
    : (request.headers.get('x-admin-secret') || '')
  if (!token) return false
  const cronSecret = process.env.CRON_SECRET
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  return (cronSecret && token === cronSecret) || (adminPassword && token === adminPassword)
}

function ensureDefaults() {
  try {
    if (!fs.existsSync(SETTINGS_DIR)) fs.mkdirSync(SETTINGS_DIR, { recursive: true })
    if (!fs.existsSync(SETTINGS_FILE)) {
      const def = {
        enabled: false,
        stakeCents: 500,
        minConfidence: 60,
        maxPicksPerDay: 25,
        dryRun: true,
        lastUpdated: new Date().toISOString(),
      }
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(def, null, 2))
    }
  } catch {}
}

function readSettings(): any {
  ensureDefaults()
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { enabled: false, stakeCents: 500, minConfidence: 60, maxPicksPerDay: 25, dryRun: true }
  }
}

function writeSettings(obj: any) {
  ensureDefaults()
  const merged = { ...readSettings(), ...obj, lastUpdated: new Date().toISOString() }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2))
  return merged
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const settings = readSettings()
  const tradingConfigured = !!(process.env.KALSHI_API_KEY_ID && process.env.KALSHI_PRIVATE_KEY)
  return NextResponse.json({ success: true, settings, tradingConfigured })
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const allowed: any = {}
    for (const k of ['enabled', 'stakeCents', 'minConfidence', 'maxPicksPerDay', 'dryRun']) {
      if (k in body) allowed[k] = body[k]
    }
    const saved = writeSettings(allowed)
    return NextResponse.json({ success: true, settings: saved })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}
