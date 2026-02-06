/**
 * Proxy to run cron jobs from the Progno admin UI.
 * Requires secret in body (CRON_SECRET or ADMIN_PASSWORD).
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const CRON_JOBS = ['daily-predictions', 'daily-results'] as const

function getBaseUrl(): string {
  if (process.env.CRON_APP_URL) return process.env.CRON_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3008'
}

function isAuthorized(secret: string | undefined): boolean {
  if (!secret?.trim()) return false
  const cronSecret = process.env.CRON_SECRET
  const adminPassword = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  return (
    (cronSecret && secret.trim() === cronSecret) ||
    (adminPassword && secret.trim() === adminPassword)
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { secret, job, date, earlyLines } = body as { secret?: string; job?: string; date?: string; earlyLines?: boolean }

    if (!isAuthorized(secret)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing secret' }, { status: 401 })
    }

    if (!job || !CRON_JOBS.includes(job as any)) {
      return NextResponse.json(
        { success: false, error: `job must be one of: ${CRON_JOBS.join(', ')}` },
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl()
    const cronSecret = process.env.CRON_SECRET
    const params = new URLSearchParams()
    if (job === 'daily-results' && date) params.set('date', date)
    if (job === 'daily-predictions' && earlyLines) params.set('earlyLines', '1')
    const path = params.toString() ? `/api/cron/${job}?${params}` : `/api/cron/${job}`
    const url = `${baseUrl}${path}`

    const res = await fetch(url, {
      method: 'GET',
      headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
      cache: 'no-store',
    })

    const data = await res.json().catch(async () => ({ message: await res.text() }))

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Cron returned ${res.status}`, detail: data },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('[progno/admin run-cron]', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'Request failed' },
      { status: 500 }
    )
  }
}
