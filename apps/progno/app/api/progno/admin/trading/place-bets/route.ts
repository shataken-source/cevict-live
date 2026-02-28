/**
 * Place selected bets on Kalshi and record them in the actual_bets table.
 *
 * POST /api/progno/admin/trading/place-bets
 * Body: {
 *   secret: string,
 *   bets: Array<{
 *     pick, home_team, away_team, sport, league, confidence,
 *     ticker, market_title, side, price, contracts, stake_cents
 *   }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// ── Auth ──────────────────────────────────────────────────────────────────────
function isAuthorized(request: NextRequest): boolean {
  const SECRET = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || ''
  if (!SECRET) return false
  const auth = request.headers.get('authorization') || ''
  const headerSecret = request.headers.get('x-admin-secret') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : headerSecret
  return !!token && token === SECRET
}

// ── Kalshi signing ────────────────────────────────────────────────────────────
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
  const msg = ts + method.toUpperCase() + urlPath.split('?')[0]
  try {
    const s = crypto.createSign('RSA-SHA256')
    s.update(msg); s.end()
    const sig = s.sign({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST }).toString('base64')
    return { sig, ts }
  } catch { return { sig: '', ts: '' } }
}

function kalshiHdrs(apiKeyId: string, privateKey: string, method: string, urlPath: string) {
  const { sig, ts } = kalshiSign(privateKey, method, urlPath)
  return { 'Content-Type': 'application/json', 'KALSHI-ACCESS-KEY': apiKeyId, 'KALSHI-ACCESS-SIGNATURE': sig, 'KALSHI-ACCESS-TIMESTAMP': ts }
}

async function placeOrder(apiKeyId: string, privateKey: string, order: any) {
  const p = '/trade-api/v2/portfolio/orders'
  const res = await fetch(`${KALSHI_BASE}${p}`, {
    method: 'POST',
    headers: kalshiHdrs(apiKeyId, privateKey, 'POST', p),
    body: JSON.stringify(order),
  })
  const text = await res.text()
  let j: any
  try { j = JSON.parse(text) } catch { j = { raw: text } }
  if (!res.ok) throw new Error(`Order failed ${res.status}: ${text.slice(0, 300)}`)
  return j
}

// ── Supabase ──────────────────────────────────────────────────────────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: any = {}
  try { body = await request.json() } catch { }
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const bets: any[] = body.bets || []
  if (bets.length === 0) {
    return NextResponse.json({ success: false, error: 'No bets selected' }, { status: 400 })
  }

  const apiKeyId = process.env.KALSHI_API_KEY_ID || ''
  const rawKey = process.env.KALSHI_PRIVATE_KEY || ''
  const privateKey = rawKey ? normalizePem(rawKey) : ''
  const configured = !!(apiKeyId && privateKey && privateKey.includes('PRIVATE KEY'))

  if (!configured) {
    return NextResponse.json({ success: false, error: 'Kalshi API not configured (KALSHI_API_KEY_ID + KALSHI_PRIVATE_KEY)' }, { status: 500 })
  }

  const supabase = getSupabase()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const results: any[] = []

  for (const bet of bets) {
    const result: any = {
      pick: bet.pick,
      ticker: bet.ticker,
      side: bet.side,
      price: bet.price,
      contracts: bet.contracts,
      stake_cents: bet.stake_cents,
    }

    if (!bet.ticker || !bet.side) {
      result.status = 'error'
      result.error = 'Missing ticker or side'
      results.push(result)
      continue
    }

    // Kalshi requires integer prices 1-99
    const price = Math.round(Number(bet.price) || 0)
    if (price < 1 || price > 99) {
      result.status = 'error'
      result.error = `Invalid price ${bet.price}¢ (must be integer 1-99). Market may have no liquidity.`
      results.push(result)
      continue
    }

    try {
      const order: Record<string, any> = {
        ticker: bet.ticker,
        client_order_id: `manual_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        side: bet.side,
        action: 'buy',
        count: bet.contracts || 1,
        type: 'limit',
        time_in_force: 'good_till_canceled',
      }
      if (bet.side === 'yes') order.yes_price = price
      else order.no_price = price

      console.log(`[place-bets] Placing: ${JSON.stringify(order)}`)
      const placed = await placeOrder(apiKeyId, privateKey, order)
      const orderId = placed?.order?.order_id || placed?.id || null

      result.status = 'submitted'
      result.order_id = orderId

      // Write to actual_bets table
      if (supabase) {
        const { error: dbError } = await supabase.from('actual_bets').insert({
          pick: bet.pick,
          home_team: bet.home_team,
          away_team: bet.away_team,
          sport: bet.sport,
          league: bet.league,
          confidence: bet.confidence,
          game_date: today,
          ticker: bet.ticker,
          market_title: bet.market_title,
          side: bet.side,
          price_cents: bet.price,
          contracts: bet.contracts,
          stake_cents: bet.stake_cents || (bet.price * bet.contracts),
          order_id: orderId,
          status: 'submitted',
          source: 'admin_ui',
          dry_run: false,
        })
        if (dbError) {
          console.error(`[place-bets] DB write error for ${bet.pick}:`, dbError.message)
          result.db_error = dbError.message
        }
      }

      results.push(result)
    } catch (e: any) {
      console.error(`[place-bets] Order error for ${bet.pick}:`, e.message)
      result.status = 'error'
      result.error = e.message?.slice(0, 200)
      results.push(result)
    }
  }

  const submitted = results.filter(r => r.status === 'submitted').length
  const errors = results.filter(r => r.status === 'error').length

  return NextResponse.json({
    success: true,
    submitted,
    errors,
    total: bets.length,
    results,
  })
}
