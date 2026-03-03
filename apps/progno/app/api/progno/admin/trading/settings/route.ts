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

const SUPABASE_BUCKET = 'predictions'
const SUPABASE_SETTINGS_PATH = 'config/trading-settings.json'
const isVercel = !!process.env.VERCEL
const DEFAULTS = { enabled: false, stakeCents: 500, minConfidence: 60, maxPicksPerDay: 25, dryRun: true }

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const { createClient } = require('@supabase/supabase-js')
    return createClient(url, key)
  } catch { return null }
}

function ensureDefaults() {
  if (isVercel) return
  try {
    if (!fs.existsSync(SETTINGS_DIR)) fs.mkdirSync(SETTINGS_DIR, { recursive: true })
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ ...DEFAULTS, lastUpdated: new Date().toISOString() }, null, 2))
    }
  } catch { }
}

async function readSettings(): Promise<any> {
  if (isVercel) {
    const sb = getSupabase()
    if (!sb) return { ...DEFAULTS }
    try {
      const { data, error } = await sb.storage.from(SUPABASE_BUCKET).download(SUPABASE_SETTINGS_PATH)
      if (error || !data) return { ...DEFAULTS }
      const text = await data.text()
      return JSON.parse(text)
    } catch { return { ...DEFAULTS } }
  }
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { ...DEFAULTS }
  }
}

async function writeSettings(obj: any) {
  const current = await readSettings()
  const merged = { ...current, ...obj, lastUpdated: new Date().toISOString() }
  if (!isVercel) {
    ensureDefaults()
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2))
  }
  const sb = getSupabase()
  if (sb) {
    try {
      const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' })
      await sb.storage.from(SUPABASE_BUCKET).upload(SUPABASE_SETTINGS_PATH, blob, { upsert: true, contentType: 'application/json' })
    } catch (e: any) { console.error('[trading-settings] Supabase save error:', e?.message) }
  }
  return merged
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const settings = await readSettings()
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
    const saved = await writeSettings(allowed)
    return NextResponse.json({ success: true, settings: saved })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}
