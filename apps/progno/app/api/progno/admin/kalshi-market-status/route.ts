/**
 * Check Kalshi market status for given tickers (or all pending bet tickers).
 * POST { secret, tickers?: string[] } → { success, markets: { [ticker]: { status, result? } } }
 * Status can be: open, closed, settled, cancelled, or error if fetch failed.
 */

import { NextRequest, NextResponse } from 'next/server'
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

async function getKalshiMarket(ticker: string, apiKeyId: string, privateKey: string): Promise<{ result?: 'yes' | 'no'; status?: string } | { error: string }> {
  const path = `/trade-api/v2/markets/${encodeURIComponent(ticker)}`
  try {
    const res = await fetch(`${KALSHI_BASE}${path}`, {
      method: 'GET',
      headers: kalshiHdrs(apiKeyId, privateKey, 'GET', path),
      cache: 'no-store',
    })
    if (!res.ok) return { error: `HTTP ${res.status}` }
    const data = await res.json().catch(() => null)
    const m = data?.market
    if (!m || typeof m !== 'object') return { error: 'No market in response' }
    return { result: m.result, status: m.status ?? 'unknown' }
  } catch (e: any) {
    return { error: e?.message || 'Fetch failed' }
  }
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
    const { secret, tickers: bodyTickers } = body as { secret?: string; tickers?: string[] }

    if (!isAuthorized(secret)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing secret' }, { status: 401 })
    }

    const apiKeyId = process.env.KALSHI_API_KEY_ID
    const rawKey = process.env.KALSHI_PRIVATE_KEY
    const privateKey = rawKey ? normalizePem(rawKey) : ''
    if (!apiKeyId || !privateKey) {
      return NextResponse.json({ success: false, error: 'Kalshi not configured (KALSHI_API_KEY_ID, KALSHI_PRIVATE_KEY)', markets: {} })
    }

    let tickers: string[] = bodyTickers && Array.isArray(bodyTickers) ? [...new Set(bodyTickers)].filter(Boolean) : []

    if (tickers.length === 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ success: false, error: 'Supabase not configured', markets: {} })
      }
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data: pending } = await supabase
        .from('actual_bets')
        .select('ticker')
        .not('ticker', 'is', null)
        .is('result', null)
      tickers = [...new Set((pending || []).map((b: any) => b.ticker).filter(Boolean))] as string[]
    }

    const markets: Record<string, { status: string; result?: string; error?: string }> = {}
    for (const ticker of tickers) {
      const info = await getKalshiMarket(ticker, apiKeyId, privateKey)
      if ('error' in info) {
        markets[ticker] = { status: 'error', error: info.error }
      } else {
        markets[ticker] = {
          status: info.status ?? 'unknown',
          ...(info.result ? { result: info.result } : {}),
        }
      }
      await new Promise((r) => setTimeout(r, 200))
    }

    return NextResponse.json({ success: true, markets })
  } catch (e: any) {
    console.error('[kalshi-market-status]', e?.message)
    return NextResponse.json({ success: false, error: e?.message || 'Failed', markets: {} }, { status: 500 })
  }
}
