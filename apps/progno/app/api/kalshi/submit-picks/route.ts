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
import { normalizeTeamName } from '../../../team-names'

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

// Elite Team Matcher (from alpha-hunter/EliteTeamMatcher.ts)
const MASCOT_WORDS = [
  'wildcats', 'bulldogs', 'tigers', 'eagles', 'red storm', 'huskies', 'knights',
  'longhorns', 'bruins', 'gators', 'cowboys', 'privateers', 'lumberjacks',
  'highlanders', 'waves', 'mustangs', 'cougars', 'vaqueros', 'delta devils',
  'rockets', 'jazz', 'lakers', 'magic', 'grizzlies', 'kings'
]

function normalize(raw: string): string {
  let name = raw.toLowerCase()
  name = name.replace(/[.,'()-]/g, '')
  name = name.replace(/\bst\b|\bst\.\b/g, 'saint')
  MASCOT_WORDS.forEach(word => {
    name = name.replace(new RegExp(`\\b${word}\\b`, 'g'), '')
  })
  name = name.replace(/\s+/g, ' ').trim()
  return name
}

function levenshtein(a: string, b: string): number {
  const matrix = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

function similarityScore(a: string, b: string): number {
  const distance = levenshtein(a, b)
  const maxLen = Math.max(a.length, b.length)
  return 1 - distance / maxLen
}

function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(' '))
  const tokensB = new Set(b.split(' '))
  const intersection = [...tokensA].filter(t => tokensB.has(t)).length
  const union = new Set([...tokensA, ...tokensB]).size
  return union === 0 ? 0 : intersection / union
}

function extractTeams(title: string): [string, string] {
  const lower = title.toLowerCase()
  if (lower.includes(' vs ')) {
    const [a, b] = lower.split(' vs ')
    return [a.trim(), b.trim()]
  }
  if (lower.includes(' @ ')) {
    const [away, home] = lower.split(' @ ')
    return [home.trim(), away.trim()]
  }
  if (lower.includes(' at ')) {
    const [away, home] = lower.split(' at ')
    return [home.trim(), away.trim()]
  }
  return ['', '']
}

function eliteMatch(sbHome: string, sbAway: string, marketTitle: string): { isMatch: boolean; confidence: number } {
  const [kA, kB] = extractTeams(marketTitle)
  if (!kA || !kB) return { isMatch: false, confidence: 0 }

  const sbHomeNorm = normalize(sbHome)
  const sbAwayNorm = normalize(sbAway)
  const kalshiHomeNorm = normalize(kA)
  const kalshiAwayNorm = normalize(kB)

  const directScore = (
    similarityScore(sbHomeNorm, kalshiHomeNorm) +
    similarityScore(sbAwayNorm, kalshiAwayNorm) +
    tokenSimilarity(sbHomeNorm, kalshiHomeNorm) +
    tokenSimilarity(sbAwayNorm, kalshiAwayNorm)
  ) / 4

  const swappedScore = (
    similarityScore(sbHomeNorm, kalshiAwayNorm) +
    similarityScore(sbAwayNorm, kalshiHomeNorm) +
    tokenSimilarity(sbHomeNorm, kalshiAwayNorm) +
    tokenSimilarity(sbAwayNorm, kalshiHomeNorm)
  ) / 4

  const confidence = Math.max(directScore, swappedScore)
  return { isMatch: confidence > 0.7, confidence }
}

async function findMarketForPick(pick: any): Promise<any | null> {
  // Search by team names in open sports markets
  const homeTeam = pick.home_team || ''
  const awayTeam = pick.away_team || ''
  const pickTeam = pick.pick || ''
  const sport = pick.sport || pick.league || ''
  const pickType = (pick.pick_type || 'MONEYLINE').toUpperCase()
  const recommendedLine = pick.recommended_line

  // Fetch ALL open sports markets with pagination
  let allMarkets: any[] = []
  let cursor: string | undefined = undefined
  const maxPages = 20 // Fetch up to 20 pages (20,000 markets)

  try {
    for (let page = 0; page < maxPages; page++) {
      let path = `/markets?status=open&limit=1000`
      if (cursor) {
        path += `&cursor=${cursor}`
      }

      const headers = buildAuthHeaders('GET', path)
      const res = await fetch(`${KALSHI_BASE}${path}`, { headers })
      if (!res.ok) {
        console.log(`[DEBUG] Page ${page} fetch failed: ${res.status}`)
        break
      }

      const data = await res.json()
      const markets = data.markets || []
      allMarkets.push(...markets)

      console.log(`[DEBUG] Page ${page}: fetched ${markets.length} markets, total so far: ${allMarkets.length}`)
      console.log(`[DEBUG] Cursor in response:`, data.cursor)

      // Check if there are more pages
      cursor = data.cursor
      if (!cursor || markets.length === 0) {
        console.log(`[DEBUG] Stopping pagination: cursor=${cursor}, markets.length=${markets.length}`)
        break
      }
    }

    console.log(`[DEBUG] Final: Fetched ${allMarkets.length} total markets`)

    // Debug: Log first few market titles for NBA games
    if (sport === 'NBA') {
      console.log(`[DEBUG] Looking for ${homeTeam} vs ${awayTeam}`)
      const sampleMarkets = allMarkets.slice(0, 10).map(m => ({ title: m.title, ticker: m.ticker }))
      console.log(`[DEBUG] Sample markets:`, JSON.stringify(sampleMarkets, null, 2))
    }

    // Find a market matching the pick (using EliteTeamMatcher)
    const match = allMarkets.find((m: any) => {
      // Skip invalid markets
      if (!m || typeof m !== 'object') return false

      // Check market status
      const status = (m.status || '').toLowerCase()
      if (status === 'settled' || status === 'suspended' || status === 'closed') return false

      // Validate yes_ask bounds
      const yesAsk = typeof m.yes_ask === 'number' ? m.yes_ask : null
      if (yesAsk === null || yesAsk <= 0 || yesAsk >= 100) return false

      // Get market title
      const title = String(m.title || '')
      if (!title) return false
      const titleLower = title.toLowerCase()

      // Skip TOTAL markets (unless pick is TOTAL)
      if (pickType !== 'TOTAL' && /\bTOTAL\b|Total Points/i.test(title)) return false

      // Skip prop markets (First Half, Quarter, etc.)
      if (/First Half|1st Half|Quarter|Period|Inning/i.test(title)) return false

      // Match based on pick type
      if (pickType === 'SPREAD') {
        // For spread picks, find spread markets with the line
        const isSpreadMarket = titleLower.includes('wins by over') || titleLower.includes('wins by under') ||
          titleLower.includes('spread') || titleLower.includes('cover')
        if (!isSpreadMarket) return false

        // Check if line matches
        if (recommendedLine) {
          const lineStr = Math.abs(recommendedLine).toString()
          if (!titleLower.includes(lineStr)) return false
        }

        // For spread markets, check if the pick team is mentioned
        // Spread markets like "Grambling St. wins by over 16.5 Points" only mention one team
        const pickNorm = normalize(pickTeam)
        const titleNorm = normalize(title)
        return titleNorm.includes(pickNorm) || pickNorm.split(' ').some(word => word.length >= 4 && titleNorm.includes(word))
      } else if (pickType === 'MONEYLINE') {
        // For moneyline, skip spread/total markets
        if (titleLower.includes('spread') || titleLower.includes('total') ||
          titleLower.includes('over') || titleLower.includes('under')) {
          return false
        }

        // Use elite matching to check if both teams match
        const teamMatch = eliteMatch(homeTeam, awayTeam, title)
        return teamMatch.isMatch && teamMatch.confidence > 0.7
      } else if (pickType === 'TOTAL') {
        // For total picks, find over/under markets
        const isTotalMarket = (titleLower.includes('over') || titleLower.includes('under')) &&
          titleLower.includes('points')
        if (!isTotalMarket) return false

        // Use elite matching to verify it's the right game
        const teamMatch = eliteMatch(homeTeam, awayTeam, title)
        return teamMatch.isMatch && teamMatch.confidence > 0.7
      }

      return false
    })

    if (sport === 'NCAAB' || sport === 'NBA') {
      console.log(`[DEBUG] ${pickType} pick for ${pickTeam}:`, match ? match.title : 'NO MATCH')
    }

    return match || null
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
  try { body = await request.json() } catch { }

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
