/**
 * POST /api/kalshi/submit-picks
 * Reads today's predictions JSON, finds matching Kalshi markets, places $5 YES orders.
 * Supports dry-run mode (no real orders placed).
 *
 * Body: { date?: string, dryRun?: boolean, earlyLines?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KALSHI_BASE = process.env.KALSHI_API_URL || 'https://api.elections.kalshi.com/trade-api/v2'
const KALSHI_KEY_ID = process.env.KALSHI_API_KEY_ID || ''
const KALSHI_PRIVATE_KEY = process.env.KALSHI_PRIVATE_KEY || ''
const STAKE_CENTS = 500 // $5.00 in cents

// ── Auth ──────────────────────────────────────────────────────────────────────
function buildAuthHeaders(method: string, path: string): Record<string, string> {
  if (!KALSHI_KEY_ID || !KALSHI_PRIVATE_KEY) {
    throw new Error('KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY must be set')
  }
  const ts = Date.now().toString()
  const nonce = crypto.randomBytes(16).toString('hex')
  // Kalshi RSA-PSS signature: timestamp + key_id + method + path
  const msgToSign = ts + KALSHI_KEY_ID + method.toUpperCase() + path
  const sign = crypto.createSign('SHA256')
  sign.update(msgToSign)
  const sig = sign.sign(
    { key: KALSHI_PRIVATE_KEY, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 },
    'base64'
  )
  return {
    'Content-Type': 'application/json',
    'KALSHI-ACCESS-KEY': KALSHI_KEY_ID,
    'KALSHI-ACCESS-TIMESTAMP': ts,
    'KALSHI-ACCESS-NONCE': nonce,
    'KALSHI-ACCESS-SIGNATURE': sig,
  }
}

// ── Kalshi market search ───────────────────────────────────────────────────────
async function searchKalshiMarkets(query: string): Promise<any[]> {
  const path = `/markets?status=open&limit=100&series_ticker=KXSPORTS`
  try {
    const headers = buildAuthHeaders('GET', path)
    const res = await fetch(`${KALSHI_BASE}${path}`, { headers })
    if (!res.ok) return []
    const data = await res.json()
    return data.markets || []
  } catch {
    return []
  }
}

async function findMarketForPick(pick: any): Promise<any | null> {
  // Search by team names in open sports markets
  const homeTeam = (pick.home_team || '').toLowerCase()
  const awayTeam = (pick.away_team || '').toLowerCase()
  const pickTeam = (pick.pick || '').toLowerCase()

  // Fetch open sports markets
  const path = `/markets?status=open&limit=1000`
  try {
    const headers = buildAuthHeaders('GET', path)
    const res = await fetch(`${KALSHI_BASE}${path}`, { headers })
    if (!res.ok) return null
    const data = await res.json()
    const markets: any[] = data.markets || []

    // Find a market whose title contains both teams and is a winner market
    return markets.find((m: any) => {
      const title = (m.title || '').toLowerCase()
      const hasHome = homeTeam && title.includes(homeTeam.split(' ').pop() || homeTeam)
      const hasAway = awayTeam && title.includes(awayTeam.split(' ').pop() || awayTeam)
      const isWinner = title.includes('winner') || title.includes('win') || m.ticker?.includes('GAME')
      return hasHome && hasAway && isWinner
    }) || null
  } catch {
    return null
  }
}

// ── Place order ────────────────────────────────────────────────────────────────
async function placeOrder(ticker: string, side: 'yes' | 'no', count: number): Promise<{ orderId: string; status: string }> {
  const path = `/portfolio/orders`
  const body = {
    ticker,
    action: 'buy',
    side,
    type: 'market',
    count, // number of contracts at $1 each
    client_order_id: crypto.randomUUID(),
  }
  const headers = buildAuthHeaders('POST', path)
  const res = await fetch(`${KALSHI_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Order failed for ${ticker}: ${err}`)
  }
  const data = await res.json()
  return { orderId: data.order?.order_id || 'unknown', status: data.order?.status || 'submitted' }
}

// ── Load predictions ───────────────────────────────────────────────────────────
function loadPredictions(date: string, earlyLines: boolean): any[] {
  const fileName = earlyLines ? `predictions-early-${date}.json` : `predictions-${date}.json`
  const filePath = join(process.cwd(), fileName)
  if (!existsSync(filePath)) return []
  try {
    const raw = readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw)
    return data.picks || []
  } catch {
    return []
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: any = {}
  try { body = await request.json() } catch {}

  const today = new Date().toISOString().split('T')[0]
  const date = body.date || today
  const dryRun = body.dryRun !== false ? (body.dryRun ?? true) : false
  const earlyLines = body.earlyLines ?? false

  const picks = loadPredictions(date, earlyLines)
  if (picks.length === 0) {
    return NextResponse.json({
      success: false,
      error: `No predictions file found for ${date}${earlyLines ? ' (early)' : ''}. Run predictions first.`,
    }, { status: 404 })
  }

  const results: any[] = []
  let submitted = 0
  let skipped = 0
  let errors = 0

  for (const pick of picks) {
    const result: any = {
      pick: pick.pick,
      game: `${pick.away_team} @ ${pick.home_team}`,
      sport: pick.sport,
      confidence: pick.confidence,
    }

    try {
      const market = await findMarketForPick(pick)
      if (!market) {
        result.status = 'no_market'
        result.note = 'No matching Kalshi market found'
        skipped++
        results.push(result)
        continue
      }

      result.ticker = market.ticker
      result.marketTitle = market.title
      result.marketPrice = market.yes_ask

      // Determine YES or NO based on which team we're picking
      const pickTeam = (pick.pick || '').toLowerCase()
      const marketTitle = (market.title || '').toLowerCase()
      // If the market title question is about the pick team winning → YES
      // Otherwise → NO (we're betting against the other team)
      const side: 'yes' | 'no' = marketTitle.includes(pickTeam.split(' ').pop() || pickTeam) ? 'yes' : 'no'
      result.side = side

      // $5 = 500 cents. Kalshi contracts are priced in cents (1-99).
      // count = floor(500 / price) to spend ~$5
      const price = side === 'yes' ? (market.yes_ask || 50) : (market.no_ask || 50)
      const count = Math.max(1, Math.floor(STAKE_CENTS / price))
      result.contracts = count
      result.estimatedCost = `$${((count * price) / 100).toFixed(2)}`

      if (dryRun) {
        result.status = 'dry_run'
        result.note = `Would buy ${count} ${side.toUpperCase()} contracts on ${market.ticker} (~${result.estimatedCost})`
      } else {
        const order = await placeOrder(market.ticker, side, count)
        result.status = 'submitted'
        result.orderId = order.orderId
        result.orderStatus = order.status
        submitted++
      }
    } catch (err: any) {
      result.status = 'error'
      result.error = err.message
      errors++
    }

    results.push(result)
  }

  return NextResponse.json({
    success: true,
    date,
    dryRun,
    earlyLines,
    totalPicks: picks.length,
    submitted: dryRun ? 0 : submitted,
    skipped,
    errors,
    stakePerPick: '$5.00',
    results,
  })
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'POST /api/kalshi/submit-picks', body: '{ date, dryRun, earlyLines }' })
}
