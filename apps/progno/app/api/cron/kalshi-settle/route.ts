/**
 * Cron: Get game results from Kalshi and update actual_bets.
 * - Fetches rows from actual_bets that have a ticker but no result (pending).
 * - Calls Kalshi GET /markets/{ticker} for each; when status is settled, sets result, profit_cents, payout_cents, settled_at.
 * Schedule: run after games settle (e.g. hourly or after daily-results). Can be triggered from admin "RUN KALSHI SETTLE".
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const KALSHI_BASE = 'https://api.elections.kalshi.com'

function normalizePem(raw: string): string {
  const normalized = raw.replace(/\\n/g, '\n').replace(/"/g, '').trim()
  const beginMatch = normalized.match(/-----BEGIN ([^-]+)-----/)
  const endMatch = normalized.match(/-----END ([^-]+)-----/)
  if (!beginMatch || !endMatch) return normalized
  const type = beginMatch[1]
  const b64 = normalized.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '')
  const wrapped = (b64.match(/.{1,64}/g) ?? []).join('\n')
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----`
}

function kalshiSign(privateKey: string, method: string, urlPath: string) {
  const ts = Date.now().toString()
  const pathOnly = urlPath.split('?')[0]
  const msg = ts + method.toUpperCase() + pathOnly
  try {
    const s = crypto.createSign('RSA-SHA256')
    s.update(msg)
    s.end()
    const sig = s
      .sign({
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
      })
      .toString('base64')
    return { sig, ts }
  } catch {
    return { sig: '', ts: '' }
  }
}

function kalshiHdrs(apiKeyId: string, privateKey: string, method: string, urlPath: string) {
  const { sig, ts } = kalshiSign(privateKey, method, urlPath)
  return {
    Accept: 'application/json',
    'KALSHI-ACCESS-KEY': apiKeyId,
    'KALSHI-ACCESS-SIGNATURE': sig,
    'KALSHI-ACCESS-TIMESTAMP': ts,
  }
}

async function getKalshiMarket(ticker: string, apiKeyId: string, privateKey: string): Promise<{ result?: 'yes' | 'no'; status?: string } | null> {
  const path = `/trade-api/v2/markets/${encodeURIComponent(ticker)}`
  const res = await fetch(`${KALSHI_BASE}${path}`, {
    method: 'GET',
    headers: kalshiHdrs(apiKeyId, privateKey, 'GET', path),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  const m = data?.market
  if (!m || typeof m !== 'object') return null
  return { result: m.result, status: m.status }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const cronSecret = process.env.CRON_SECRET
  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKeyId = process.env.KALSHI_API_KEY_ID
  const rawKey = process.env.KALSHI_PRIVATE_KEY
  const privateKey = rawKey ? normalizePem(rawKey) : ''
  if (!apiKeyId || !privateKey) {
    return NextResponse.json({
      success: false,
      error: 'Kalshi not configured (KALSHI_API_KEY_ID, KALSHI_PRIVATE_KEY)',
      updated: 0,
    }, { status: 200 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ success: false, error: 'Supabase not configured', updated: 0 }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: pending, error: fetchError } = await supabase
    .from('actual_bets')
    .select('id, ticker, side, contracts, stake_cents')
    .not('ticker', 'is', null)
    .is('result', null)

  if (fetchError) {
    console.error('[kalshi-settle] Fetch pending error:', fetchError.message)
    return NextResponse.json({ success: false, error: fetchError.message, updated: 0 }, { status: 500 })
  }

  if (!pending?.length) {
    return NextResponse.json({ success: true, updated: 0, message: 'No pending Kalshi bets' })
  }

  const tickers = [...new Set((pending as any[]).map((b) => b.ticker).filter(Boolean))] as string[]
  let updated = 0
  let cancelled = 0

  const isSettled = (s: string | undefined) => s === 'settled' || s === 'closed' || s === 'finalized'

  for (const ticker of tickers) {
    const market = await getKalshiMarket(ticker, apiKeyId, privateKey)
    if (!market) continue

    const rows = (pending as any[]).filter((b) => b.ticker === ticker)

    // Cancelled market: refund stake, mark as cancelled
    if (market.status === 'cancelled') {
      for (const row of rows) {
        const stakeCents = Math.max(0, parseInt(row.stake_cents, 10) || 0)
        const { error: updateError } = await supabase
          .from('actual_bets')
          .update({
            result: 'cancelled',
            payout_cents: stakeCents,
            profit_cents: 0,
            settled_at: new Date().toISOString(),
            status: 'cancelled',
          })
          .eq('id', row.id)
        if (!updateError) cancelled++
        else console.warn('[kalshi-settle] Cancel update error for', row.id, updateError.message)
      }
      await new Promise((r) => setTimeout(r, 300))
      continue
    }

    // Settled/finalized with result: win or loss
    if (!isSettled(market.status) || !market.result) continue

    const result = market.result
    for (const row of rows) {
      const side = (row.side || '').toLowerCase()
      if (side !== 'yes' && side !== 'no') continue

      const isWin = side === result
      const contracts = Math.max(0, parseInt(row.contracts, 10) || 0)
      const stakeCents = Math.max(0, parseInt(row.stake_cents, 10) || 0)
      const payoutCents = isWin ? contracts * 100 : 0
      const profitCents = payoutCents - stakeCents

      const { error: updateError } = await supabase
        .from('actual_bets')
        .update({
          result: isWin ? 'win' : 'loss',
          payout_cents: payoutCents,
          profit_cents: profitCents,
          settled_at: new Date().toISOString(),
          status: isWin ? 'won' : 'lost',
        })
        .eq('id', row.id)

      if (!updateError) updated++
      else console.warn('[kalshi-settle] Update error for', row.id, updateError.message)
    }

    await new Promise((r) => setTimeout(r, 300))
  }

  return NextResponse.json({ success: true, updated, cancelled, pending: pending.length })
}
