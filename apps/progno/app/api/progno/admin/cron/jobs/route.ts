import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DATA_DIR = path.join(process.cwd(), '.progno')
const JOBS_FILE = path.join(DATA_DIR, 'cron-jobs.json')

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return false
  const cronSecret = process.env.CRON_SECRET
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  return (cronSecret && token === cronSecret) || (adminPassword && token === adminPassword)
}

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(JOBS_FILE)) fs.writeFileSync(JOBS_FILE, JSON.stringify({ jobs: [] }, null, 2))
}

function readJobs(): any[] {
  ensureStorage()
  try { const raw = fs.readFileSync(JOBS_FILE, 'utf8'); const j = JSON.parse(raw); return Array.isArray(j.jobs) ? j.jobs : [] } catch { return [] }
}

function writeJobs(jobs: any[]) {
  ensureStorage(); fs.writeFileSync(JOBS_FILE, JSON.stringify({ jobs }, null, 2))
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const jobs = readJobs()
  return NextResponse.json({ success: true, jobs })
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json().catch(() => ({}))
    const jobs = readJobs()
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
    writeJobs(jobs)
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
    const jobs = readJobs().filter((j: any) => j.id !== id)
    writeJobs(jobs)
    return NextResponse.json({ success: true, jobs })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}
