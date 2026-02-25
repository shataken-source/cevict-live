/**
 * Cron: Submit today's picks to Kalshi
 * Proxies to /api/kalshi/submit-picks with dryRun=false
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getBaseUrl(): string {
  if (process.env.CRON_APP_URL) return process.env.CRON_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3008'
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const cronSecret = process.env.CRON_SECRET
  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const date = url.searchParams.get('date') || undefined
  const dryRun = url.searchParams.get('dryRun') === '1'

  const baseUrl = getBaseUrl()
  const res = await fetch(`${baseUrl}/api/kalshi/submit-picks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
    },
    body: JSON.stringify({ date, dryRun }),
    cache: 'no-store',
  })

  const raw = await res.text()
  let data: any
  try { data = JSON.parse(raw) } catch { data = { message: raw } }

  return NextResponse.json(data, { status: res.ok ? 200 : res.status })
}
