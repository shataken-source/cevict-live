/**
 * KALSHI SUBMIT PICKS — Production
 * Uses /events endpoint (proven in execute/route.ts)
 * Correct RSA-PSS auth, sports-only filtering, ABBREV_MAP + word overlap matching
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KALSHI_BASE = 'https://api.elections.kalshi.com'
const API_KEY = process.env.KALSHI_API_KEY_ID || ''
const RAW_KEY = process.env.KALSHI_PRIVATE_KEY || ''

const STAKE_CENTS = 500
const MAX_PRICE = 85
const MIN_PRICE = 5
const MAX_CONTRACTS = 100

// ── PEM normalization (handles \n escapes from env vars) ─────────────────────
function normalizePem(raw: string): string {
  const normalized = raw.replace(/\\n/g, '\n').replace(/"/g, '').trim()
  const beginMatch = normalized.match(/-----BEGIN ([^-]+)-----/)
  const endMatch = normalized.match(/-----END ([^-]+)-----/)
  if (!beginMatch || !endMatch) return normalized
  const type = beginMatch[1]
  const b64 = normalized
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '')
  const wrapped = (b64.match(/.{1,64}/g) ?? []).join('\n')
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----`
}

const PRIVATE_KEY = RAW_KEY ? normalizePem(RAW_KEY) : ''
const CONFIGURED = !!(API_KEY && PRIVATE_KEY && PRIVATE_KEY.includes('PRIVATE KEY'))

// ── Auth (matches proven execute/route.ts signature format) ──────────────────
function kalshiSign(method: string, urlPath: string) {
  const ts = Date.now().toString()
  const msg = ts + method.toUpperCase() + urlPath.split('?')[0]
  try {
    const s = crypto.createSign('RSA-SHA256')
    s.update(msg); s.end()
    const sig = s.sign({
      key: PRIVATE_KEY,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    }).toString('base64')
    return { sig, ts }
  } catch { return { sig: '', ts: '' } }
}

function kalshiHeaders(method: string, urlPath: string) {
  const { sig, ts } = kalshiSign(method, urlPath)
  return {
    'Content-Type': 'application/json',
    'KALSHI-ACCESS-KEY': API_KEY,
    'KALSHI-ACCESS-SIGNATURE': sig,
    'KALSHI-ACCESS-TIMESTAMP': ts,
  }
}

// ── ABBREV_MAP for pro team ticker suffix matching ───────────────────────────
const ABBREV_MAP: Record<string, string[]> = {
  NYK: ['knicks', 'new york k'], HOU: ['houston', 'rockets', 'astros'],
  DET: ['detroit', 'pistons', 'tigers', 'red wings'], CHI: ['chicago', 'bulls', 'cubs', 'blackhawks'],
  SAS: ['san antonio', 'spurs'], SAC: ['sacramento', 'kings'],
  MEM: ['memphis', 'grizzlies'], UTA: ['utah', 'jazz'],
  MIL: ['milwaukee', 'bucks', 'brewers'], ATL: ['atlanta', 'hawks', 'braves'],
  PHI: ['philadelphia', '76ers', 'sixers', 'phillies', 'flyers'],
  NOP: ['new orleans', 'pelicans'], MIA: ['miami', 'heat', 'marlins'],
  BOS: ['boston', 'celtics', 'red sox', 'bruins'],
  GSW: ['golden state', 'warriors'], LAL: ['lakers'],
  LAC: ['clippers'], DEN: ['denver', 'nuggets', 'rockies'],
  MIN: ['minnesota', 'timberwolves', 'twins', 'wild'],
  OKC: ['oklahoma', 'thunder'], POR: ['portland', 'trail blazers'],
  PHX: ['phoenix', 'suns'], DAL: ['dallas', 'mavericks'],
  IND: ['indiana', 'pacers'], CLE: ['cleveland', 'cavaliers', 'guardians'],
  TOR: ['toronto', 'raptors', 'blue jays', 'maple leafs'],
  BKN: ['brooklyn', 'nets'], WAS: ['washington', 'wizards', 'nationals', 'capitals'],
  CHA: ['charlotte', 'hornets'], ORL: ['orlando', 'magic'],
  STL: ['cardinals', 'st. louis', 'st louis', 'blues'],
  SEA: ['mariners', 'seattle', 'kraken'],
}

// ── Game series prefixes (confirmed working from execute/route.ts) ───────────
const GAME_SERIES: Array<{ prefix: string; sport: string }> = [
  { prefix: 'KXNBAGAME', sport: 'NBA' },
  { prefix: 'KXNCAAMBGAME', sport: 'NCAAB' },
  { prefix: 'KXNCAABGAME', sport: 'NCAAB' },
  { prefix: 'KXNCAAWBGAME', sport: 'NCAAB' },
  { prefix: 'KXNFLGAME', sport: 'NFL' },
  { prefix: 'KXNHLGAME', sport: 'NHL' },
  { prefix: 'KXMLBGAME', sport: 'MLB' },
  { prefix: 'KXNCAAFGAME', sport: 'NCAAF' },
  { prefix: 'KXUNRIVALEDGAME', sport: 'NBA' },
]

function normSport(s: string): string {
  const u = (s || '').toUpperCase()
  if (u.includes('NBA')) return 'NBA'
  if (u.includes('NCAAB') || u.includes('CBB') || u.includes('COLLEGE BASKETBALL')) return 'NCAAB'
  if (u.includes('NCAAF') || u.includes('CFB') || u.includes('COLLEGE FOOTBALL')) return 'NCAAF'
  if (u.includes('NFL')) return 'NFL'
  if (u.includes('NHL') || u.includes('HOCKEY')) return 'NHL'
  if (u.includes('NCAA') || u.includes('COLLEGE')) return 'NCAAB'
  if (u.includes('MLB')) return 'MLB'
  return u
}

// ── Fetch sports game-winner markets via /events endpoint ────────────────────
async function fetchSportsMarkets(): Promise<{ markets: any[]; error: string | null }> {
  const all: any[] = []
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  let cursor: string | undefined
  let fetchError: string | null = null
  const eventsPath = '/trade-api/v2/events'

  for (let pg = 0; pg < 25; pg++) {
    const params = new URLSearchParams({ status: 'open', limit: '200', with_nested_markets: 'true' })
    if (cursor) params.set('cursor', cursor)
    const p = `${eventsPath}?${params}`
    try {
      const res = await fetch(`${KALSHI_BASE}${p}`, { headers: kalshiHeaders('GET', eventsPath) })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        fetchError = `HTTP ${res.status}: ${txt.slice(0, 300)}`
        console.error(`[kalshi] events page ${pg} ${fetchError}`)
        if (res.status === 429) await sleep(2000)
        break
      }
      const d = await res.json()
      const events: any[] = d.events || []
      console.log(`[kalshi] events page ${pg}: ${events.length} events, cursor=${d.cursor?.slice?.(0, 8) ?? 'none'}`)
      if (pg === 0 && events.length === 0) {
        fetchError = `Events API returned 0 events on page 0`
        break
      }
      for (const ev of events) {
        const cat = (ev.category || '').toUpperCase()
        if (cat !== 'SPORTS') continue
        const et = (ev.event_ticker || '').toUpperCase()
        const gs = GAME_SERIES.find(s => et.startsWith(s.prefix))
        if (!gs) continue
        for (const m of (ev.markets || [])) {
          all.push({ ...m, _sport: gs.sport, event_ticker: ev.event_ticker })
        }
      }
      cursor = d.cursor
      if (events.length < 200 || !cursor) break
      await sleep(150)
    } catch (e: any) {
      fetchError = `exception: ${e?.message}`
      console.error(`[kalshi] events page ${pg} ${fetchError}`)
      break
    }
  }

  console.log(`[kalshi] fetched ${all.length} sports game markets from events endpoint`)
  return { markets: all, error: fetchError }
}

// ── Ticker suffix helper ─────────────────────────────────────────────────────
function tickerSuffix(ticker: string): string {
  const parts = ticker.split('-')
  return parts[parts.length - 1].toUpperCase()
}

function teamMatchesSuffix(teamLower: string, suffix: string): boolean {
  const kws = ABBREV_MAP[suffix] || []
  if (kws.some(kw => teamLower.includes(kw))) return true
  const sfxLower = suffix.toLowerCase()
  const teamWords = teamLower.split(/\s+/)
  return teamWords.some(w => w === sfxLower)
}

// ── Match pick to market (event-grouped, both-teams validation) ──────────────
function titleMatchesBothTeams(title: string, homeLower: string, awayLower: string, markets: any[]): boolean {
  const suffixes = markets.map(m => tickerSuffix(m.ticker))
  const homeMatched = suffixes.some(sfx => teamMatchesSuffix(homeLower, sfx))
  const awayMatched = suffixes.some(sfx => teamMatchesSuffix(awayLower, sfx))
  if (homeMatched && awayMatched) return true
  const homeWords = homeLower.split(/\s+/).filter(w => w.length >= 4)
  const awayWords = awayLower.split(/\s+/).filter(w => w.length >= 4)
  const homeHit = homeWords.some(w => title.includes(w))
  const awayHit = awayWords.some(w => title.includes(w))
  return homeHit && awayHit
}

function matchPickToMarket(pick: any, markets: any[]): any | null {
  const pickLower = (pick.pick || '').toLowerCase()
  const homeLower = (pick.home_team || '').toLowerCase()
  const awayLower = (pick.away_team || '').toLowerCase()
  const pickSport = normSport(pick.league || pick.sport || '')
  const sportMarkets = markets.filter((m: any) => !m._sport || m._sport === pickSport)

  const eventGroups = new Map<string, any[]>()
  for (const m of sportMarkets) {
    const ek = m.event_ticker || m.ticker
    if (!eventGroups.has(ek)) eventGroups.set(ek, [])
    eventGroups.get(ek)!.push(m)
  }

  for (const [, group] of eventGroups) {
    const title = (group[0].title || '').toLowerCase().replace(/winner\?/g, '')
    if (!titleMatchesBothTeams(title, homeLower, awayLower, group)) continue

    for (const m of group) {
      const kws = ABBREV_MAP[tickerSuffix(m.ticker)] || []
      if (kws.some(kw => pickLower.includes(kw))) return m
    }
    for (const m of group) {
      const sfx = tickerSuffix(m.ticker).toLowerCase()
      if (pickLower.includes(sfx)) return m
    }
    const atIdx = title.indexOf(' at ')
    if (atIdx > 0) {
      const awayPart = title.substring(0, atIdx)
      const pickWords = pickLower.split(/\s+/).filter(w => w.length >= 4)
      const pickIsAway = pickWords.some(w => awayPart.includes(w))
      for (const m of group) {
        const sfx = tickerSuffix(m.ticker)
        const sfxKws = ABBREV_MAP[sfx] || []
        const sfxMatchesAway = sfxKws.some(kw => awayLower.includes(kw)) || awayLower.includes(sfx.toLowerCase())
        if (pickIsAway && sfxMatchesAway) return m
        if (!pickIsAway && !sfxMatchesAway) return m
      }
    }
    return group[0]
  }
  return null
}

// ── Side detection ───────────────────────────────────────────────────────────
function determineSide(pick: any, market: any): 'yes' | 'no' {
  const pickLower = (pick.pick || '').toLowerCase()
  const sfx = tickerSuffix(market.ticker)

  const kws = ABBREV_MAP[sfx] || []
  if (kws.length > 0) return kws.some(kw => pickLower.includes(kw)) ? 'yes' : 'no'

  if (pickLower.includes(sfx.toLowerCase())) return 'yes'

  const title = (market.title || '').toLowerCase()
  const atIdx = title.indexOf(' at ')
  if (atIdx > 0) {
    const awayPart = title.substring(0, atIdx)
    const pickWords = pickLower.split(/\s+/).filter((w: string) => w.length >= 4)
    if (pickWords.some((w: string) => awayPart.includes(w))) return 'yes'
  }
  return 'no'
}

// ── Place order ──────────────────────────────────────────────────────────────
async function placeOrder(ticker: string, side: 'yes' | 'no', count: number, price: number) {
  const p = '/trade-api/v2/portfolio/orders'
  const order: Record<string, any> = {
    ticker,
    client_order_id: `submit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    side,
    action: 'buy',
    count,
    type: 'limit',
  }
  if (side === 'yes') order.yes_price = price; else order.no_price = price

  const res = await fetch(`${KALSHI_BASE}${p}`, {
    method: 'POST',
    headers: kalshiHeaders('POST', p),
    body: JSON.stringify(order),
  })
  const text = await res.text()
  let j: any
  try { j = JSON.parse(text) } catch { j = { raw: text } }
  if (!res.ok) throw new Error(`Order failed ${res.status}: ${text}`)
  return j
}

// ── Load picks ───────────────────────────────────────────────────────────────
function loadPredictions(date: string, early: boolean) {
  const file = early ? `predictions-early-${date}.json` : `predictions-${date}.json`
  const p = join(process.cwd(), file)
  if (!existsSync(p)) return []
  try {
    return JSON.parse(readFileSync(p, 'utf8')).picks || []
  } catch { return [] }
}

// ── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  const today = new Date().toISOString().split('T')[0]
  const date = body.date || today
  const dryRun = body.dryRun ?? true
  const earlyLines = body.earlyLines ?? false

  const picks = loadPredictions(date, earlyLines)
  if (!picks.length) {
    return NextResponse.json(
      { success: false, error: `No picks found for ${date}` },
      { status: 404 }
    )
  }

  let openMarkets: any[] = []
  let marketFetchError: string | null = null
  if (CONFIGURED) {
    const fetched = await fetchSportsMarkets()
    openMarkets = fetched.markets
    marketFetchError = fetched.error
  } else {
    marketFetchError = `Not configured: apiKey=${!!API_KEY} privateKey=${!!PRIVATE_KEY}`
  }

  const results: any[] = []

  for (const pick of picks) {
    const result: any = {
      game: `${pick.away_team} @ ${pick.home_team}`,
      pick: pick.pick,
      sport: pick.sport,
      confidence: pick.confidence,
    }

    try {
      const market = matchPickToMarket(pick, openMarkets)
      if (!market) {
        result.status = 'no_market'
        results.push(result)
        continue
      }

      const side = determineSide(pick, market)
      const price = side === 'yes' ? (market.yes_ask || 50) : (market.no_ask || 50)

      if (price < MIN_PRICE || price > MAX_PRICE) {
        result.status = 'price_filtered'
        result.price = price
        results.push(result)
        continue
      }

      const count = Math.min(MAX_CONTRACTS, Math.max(1, Math.floor(STAKE_CENTS / price)))

      result.ticker = market.ticker
      result.marketTitle = market.title
      result.side = side
      result.price = price
      result.contracts = count
      result.estimatedCost = `$${((count * price) / 100).toFixed(2)}`

      if (dryRun) {
        result.status = 'dry_run'
      } else {
        const order = await placeOrder(market.ticker, side, count, price)
        result.status = 'submitted'
        result.orderId = order?.order?.order_id || null
      }
    } catch (err: any) {
      result.status = 'error'
      result.error = err.message
    }

    results.push(result)
  }

  const matched = results.filter(r => r.status === 'dry_run' || r.status === 'submitted').length
  const noMarket = results.filter(r => r.status === 'no_market').length
  const errors = results.filter(r => r.status === 'error').length

  return NextResponse.json({
    success: true,
    configured: CONFIGURED,
    dryRun,
    totalPicks: picks.length,
    matched,
    noMarket,
    errors,
    marketsFetched: openMarkets.length,
    marketFetchError,
    stakePerPick: `$${(STAKE_CENTS / 100).toFixed(2)}`,
    results,
  })
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    configured: CONFIGURED,
    endpoint: 'POST /api/kalshi/submit-picks',
  })
}
