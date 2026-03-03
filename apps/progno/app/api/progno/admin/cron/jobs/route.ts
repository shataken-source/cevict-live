import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DATA_DIR = path.join(process.cwd(), '.progno')
const JOBS_FILE = path.join(DATA_DIR, 'cron-jobs.json')
const SUPABASE_BUCKET = 'predictions'
const SUPABASE_JOBS_PATH = 'config/cron-jobs.json'
const isVercel = !!process.env.VERCEL

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return false
  const cronSecret = process.env.CRON_SECRET
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  return (cronSecret && token === cronSecret) || (adminPassword && token === adminPassword)
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const { createClient } = require('@supabase/supabase-js')
    return createClient(url, key)
  } catch { return null }
}

function ensureStorage() {
  if (isVercel) return
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(JOBS_FILE)) fs.writeFileSync(JOBS_FILE, JSON.stringify({ jobs: [] }, null, 2))
}

async function readJobs(): Promise<any[]> {
  if (isVercel) {
    const sb = getSupabase()
    if (!sb) return []
    try {
      const { data, error } = await sb.storage.from(SUPABASE_BUCKET).download(SUPABASE_JOBS_PATH)
      if (error || !data) return []
      const text = await data.text()
      const j = JSON.parse(text)
      return Array.isArray(j.jobs) ? j.jobs : []
    } catch { return [] }
  }
  ensureStorage()
  try { const raw = fs.readFileSync(JOBS_FILE, 'utf8'); const j = JSON.parse(raw); return Array.isArray(j.jobs) ? j.jobs : [] } catch { return [] }
}

async function writeJobs(jobs: any[]) {
  if (!isVercel) {
    ensureStorage(); fs.writeFileSync(JOBS_FILE, JSON.stringify({ jobs }, null, 2))
  }
  const sb = getSupabase()
  if (sb) {
    try {
      const blob = new Blob([JSON.stringify({ jobs }, null, 2)], { type: 'application/json' })
      await sb.storage.from(SUPABASE_BUCKET).upload(SUPABASE_JOBS_PATH, blob, { upsert: true, contentType: 'application/json' })
    } catch (e: any) { console.error('[cron-jobs] Supabase save error:', e?.message) }
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const jobs = await readJobs()
  return NextResponse.json({ success: true, jobs })
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json().catch(() => ({}))
    const jobs = await readJobs()
    const now = new Date().toISOString()
    if (body && body.id) {
      const idx = jobs.findIndex((j: any) => j.id === body.id)
      if (idx >= 0) {
        jobs[idx] = { ...jobs[idx], ...body, updatedAt: now }
      } else {
        jobs.push({ ...body, id: String(body.id), createdAt: now, updatedAt: now })
      }
    } else {
      const id = `job_${Date.now()}`
      jobs.push({ id, name: body.name || 'job', url: body.url || '', method: (body.method || 'GET').toUpperCase(), schedule: body.schedule || '0 12 * * *', headers: body.headers || {}, body: body.body || null, enabled: body.enabled ?? true, createdAt: now, updatedAt: now })
    }
    await writeJobs(jobs)
    return NextResponse.json({ success: true, jobs })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json().catch(() => ({}))
    const { id } = body || {}
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const jobs = (await readJobs()).filter((j: any) => j.id !== id)
    await writeJobs(jobs)
    return NextResponse.json({ success: true, jobs })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}
