/**
 * Cron: Submit today's picks to Kalshi
 * Proxies to /api/progno/admin/trading/execute (which has BLOCKED_PREFIXES,
 * MAX_CONTRACTS_PER_BET, MAX_BET_COST_CENTS safeguards)
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function getBaseUrl(): string {
  if (process.env.CRON_APP_URL) return process.env.CRON_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3008'
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const cronSecret = process.env.CRON_SECRET
  const adminPwd = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const isAuth = isVercelCron || (cronSecret && token === cronSecret) || (adminPwd && token === adminPwd)
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // The execute route reads settings.json for enabled/dryRun/stake/minConfidence
  // and has all Kalshi safeguards (blocked prefixes, contract caps, cost caps)
  const secret = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || cronSecret || ''
  const baseUrl = getBaseUrl()
  const res = await fetch(`${baseUrl}/api/progno/admin/trading/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ secret }),
    cache: 'no-store',
  })

  const raw = await res.text()
  let data: any
  try { data = JSON.parse(raw) } catch { data = { message: raw } }

  return NextResponse.json(data, { status: res.ok ? 200 : res.status })
}
