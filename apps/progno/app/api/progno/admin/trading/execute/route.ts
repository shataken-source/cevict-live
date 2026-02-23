import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// ── Auth ──────────────────────────────────────────────────────────────────────
function isAuthorized(request: NextRequest, bodySecret?: string): { ok: boolean; token?: string } {
  const SECRET = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || ''
  // If no secret configured, allow all (matches /api/progno/admin/reports pattern)
  if (!SECRET) return { ok: true, token: '' }
  const auth = request.headers.get('authorization') || ''
  const headerSecret = request.headers.get('x-admin-secret') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : headerSecret
  const candidates = [token, bodySecret].filter(Boolean)
  const ok = candidates.some(t => t === SECRET)
  // Also allow if called from same origin with no token (internal admin page)
  const origin = request.headers.get('origin') || request.headers.get('referer') || ''
  const isInternal = origin.includes('localhost') || origin.includes('127.0.0.1')
  return { ok: ok || isInternal, token: candidates[0] || SECRET }
}

function getBaseUrl(req: NextRequest): string {
  try { const u = new URL(req.url); return `${u.protocol}//${u.host}` } catch { return process.env.CRON_APP_URL || 'http://localhost:3008' }
}

// ── Settings ──────────────────────────────────────────────────────────────────
async function loadSettings(baseUrl: string, authHeader: string) {
  const res = await fetch(`${baseUrl}/api/progno/admin/trading/settings`, {
    headers: { Authorization: authHeader }, cache: 'no-store'
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || !j?.success) throw new Error(j?.error || 'Failed to load settings')
  return j.settings as { enabled: boolean; stakeCents: number; minConfidence: number; maxPicksPerDay: number; dryRun: boolean }
}

// ── Load picks from both predictions files ────────────────────────────────────
function loadPredictionsFile(filePath: string): any[] {
  try {
    if (!fs.existsSync(filePath)) return []
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data.picks) ? data.picks : []
  } catch { return [] }
}

function loadBestPicks(today: string, minConfidence: number, maxPicks: number): any[] {
  const root = process.cwd()
  const regularPicks = loadPredictionsFile(path.join(root, `predictions-${today}.json`))
  const earlyPicks = loadPredictionsFile(path.join(root, `predictions-early-${today}.json`))

  // Tag source
  regularPicks.forEach(p => { p._source = 'regular' })
  earlyPicks.forEach(p => { p._source = 'early' })

  // Merge and deduplicate by game_id (prefer regular over early if same game)
  const seen = new Map<string, any>()
  for (const p of [...regularPicks, ...earlyPicks]) {
    const key = p.game_id || p.id || `${p.home_team}|${p.away_team}`
    if (!key) continue
    if (!seen.has(key)) {
      seen.set(key, p)
    } else {
      // Keep higher confidence
      const existing = seen.get(key)!
      if ((p.confidence || 0) > (existing.confidence || 0)) seen.set(key, p)
    }
  }

  const merged = Array.from(seen.values())
    .filter(p => (p.confidence || 0) >= minConfidence)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, maxPicks)

  return merged
}

const KALSHI_BASE = 'https://api.elections.kalshi.com'


// ── Abbreviation map for ticker suffix → team keywords ────────────────────────
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
  NYY: ['yankees'], NYM: ['mets'], NYR: ['rangers', 'new york r'],
  NYI: ['islanders'], NJD: ['devils', 'new jersey'],
  CHC: ['cubs'], CWS: ['white sox'],
  LAD: ['dodgers'], LAA: ['angels'],
  SFG: ['giants', 'san francisco'], SDP: ['padres', 'san diego'],
  ATH: ["athletics", "a's", 'oakland'],
  STL: ['cardinals', 'st. louis', 'st louis', 'blues'],
  PIT: ['pirates', 'pittsburgh', 'penguins'],
  CIN: ['reds', 'cincinnati'], KCR: ['royals', 'kansas city'],
  SEA: ['mariners', 'seattle', 'kraken'], TEX: ['rangers', 'texas'],
  BAL: ['orioles', 'baltimore'], TBR: ['rays', 'tampa bay'],
  WSN: ['nationals'], FLA: ['marlins', 'florida', 'panthers'],
  COL: ['rockies', 'colorado', 'avalanche'],
  AZ: ['diamondbacks', 'arizona'], ARI: ['diamondbacks', 'arizona', 'coyotes'],
  WSH: ['capitals'], CAR: ['hurricanes', 'carolina'],
  TBL: ['lightning'], CBJ: ['blue jackets', 'columbus'],
  NSH: ['predators', 'nashville'], WPG: ['jets', 'winnipeg'],
  SJS: ['sharks', 'san jose'], ANA: ['ducks', 'anaheim'],
  LAK: ['kings'], VAN: ['canucks', 'vancouver'],
  CGY: ['flames', 'calgary'], EDM: ['oilers', 'edmonton'],
  VGK: ['golden knights', 'vegas'], MTL: ['canadiens', 'montreal'],
  OTT: ['senators', 'ottawa'], BUF: ['sabres', 'buffalo'],
}

function tickerSuffix(ticker: string): string {
  const parts = ticker.split('-')
  return parts[parts.length - 1].toUpperCase()
}

function normSport(s: string): string {
  const u = (s || '').toUpperCase()
  if (u.includes('NBA')) return 'NBA'
  if (u.includes('NCAAB') || u.includes('CBB') || u.includes('COLLEGE BASKETBALL')) return 'NCAAB'
  if (u.includes('NCAAF') || u.includes('CFB') || u.includes('COLLEGE FOOTBALL')) return 'NCAAF'
  if (u.includes('NFL')) return 'NFL'
  if (u.includes('NHL') || u.includes('HOCKEY')) return 'NHL'
  // College basketball is the most common NCAA sport on Kalshi
  if (u.includes('NCAA') || u.includes('COLLEGE')) return 'NCAAB'
  if (u.includes('MLB') || (u.includes('BASEBALL') && !u.includes('NCAA'))) return 'MLB'
  return u
}

// ── Kalshi RSA-PSS signing ────────────────────────────────────────────────────
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

// ── Fetch sports game-winner markets via /events endpoint ───────────────────
// /events excludes multivariate/parlay events by default (no filter needed).
// with_nested_markets=true returns the individual YES/NO markets inside each event.
// Filter by category=Sports and game series prefixes confirmed by live API testing.
const GAME_SERIES: Array<{ prefix: string; sport: string }> = [
  // Winner/Game markets (highest priority)
  { prefix: 'KXNBAGAME', sport: 'NBA' },
  { prefix: 'KXNCAAMBGAME', sport: 'NCAAB' },
  { prefix: 'KXNCAABGAME', sport: 'NCAAB' },
  { prefix: 'KXNFLGAME', sport: 'NFL' },
  { prefix: 'KXNHLGAME', sport: 'NHL' },
  { prefix: 'KXSHLGAME', sport: 'NHL' },
  { prefix: 'KXMLBGAME', sport: 'MLB' },
  { prefix: 'KXNCAAFGAME', sport: 'NCAAF' },
  { prefix: 'KXUNRIVALEDGAME', sport: 'NBA' },
  // Spread markets (some games only have spread, no winner market)
  { prefix: 'KXNCAAMBSPREAD', sport: 'NCAAB' },
  { prefix: 'KXNBASPREAD', sport: 'NBA' },
  { prefix: 'KXNFLSPREAD', sport: 'NFL' },
  { prefix: 'KXNHLSPREAD', sport: 'NHL' },
  // Total markets
  { prefix: 'KXNCAAMBTOTAL', sport: 'NCAAB' },
  { prefix: 'KXNBATOTAL', sport: 'NBA' },
  { prefix: 'KXNFLTOTAL', sport: 'NFL' },
  { prefix: 'KXNHLTOTAL', sport: 'NHL' },
  // Other
  { prefix: 'KXNCAABASEBALL', sport: 'NCAAB' },
  { prefix: 'KXCBGAME', sport: 'NCAAB' },
]

async function fetchSportsMarkets(apiKeyId: string, privateKey: string): Promise<{ markets: any[]; error: string | null }> {
  const all: any[] = []
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  let cursor: string | undefined
  let fetchError: string | null = null
  // Use /events endpoint — excludes parlays by default, returns nested markets per event
  const eventsPath = '/trade-api/v2/events'

  for (let pg = 0; pg < 25; pg++) {
    const params = new URLSearchParams({ status: 'open', limit: '200', with_nested_markets: 'true' })
    if (cursor) params.set('cursor', cursor)
    const p = `${eventsPath}?${params}`
    try {
      const res = await fetch(`${KALSHI_BASE}${p}`, { headers: kalshiHdrs(apiKeyId, privateKey, 'GET', eventsPath) })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        const errMsg = `HTTP ${res.status}: ${txt.slice(0, 300)}`
        console.error(`[kalshi] events page ${pg} ${errMsg}`)
        fetchError = errMsg
        if (res.status === 429) await sleep(2000)
        break
      }
      const d = await res.json()
      const events: any[] = d.events || []
      console.log(`[kalshi] events page ${pg}: ${events.length} events, cursor=${d.cursor?.slice?.(0, 8) ?? 'none'}`)
      if (pg === 0 && events.length === 0) {
        fetchError = `Events API returned 0 events on page 0. Raw: ${JSON.stringify(d).slice(0, 200)}`
        break
      }
      for (const ev of events) {
        const cat = (ev.category || '').toUpperCase()
        if (cat !== 'SPORTS') continue
        const et = (ev.event_ticker || '').toUpperCase()
        // Skip women's sports (NCAAWB, WNBA, etc.) — Progno only predicts men's
        if (/NCAAWB|WNBA|WCBB|WOMEN/i.test(et)) continue
        const gs = GAME_SERIES.find(s => et.startsWith(s.prefix))
        if (!gs) continue
        // Flatten nested markets, tagging each with sport and event_ticker
        for (const m of (ev.markets || [])) {
          all.push({ ...m, _sport: gs.sport, event_ticker: ev.event_ticker })
        }
      }
      cursor = d.cursor
      if (events.length < 200 || !cursor) break
      await sleep(150)
    } catch (e: any) {
      const errMsg = `exception: ${e?.message}`
      console.error(`[kalshi] events page ${pg} ${errMsg}`)
      fetchError = errMsg
      break
    }
  }

  // Log sport breakdown
  const sportCounts: Record<string, number> = {}
  for (const m of all) { sportCounts[m._sport] = (sportCounts[m._sport] || 0) + 1 }
  console.log(`[kalshi] fetched ${all.length} sports game markets from events endpoint. Breakdown: ${JSON.stringify(sportCounts)}, error=${fetchError}`)
  // Log sample titles for debugging
  if (all.length > 0) {
    all.slice(0, 5).forEach(m => console.log(`[kalshi]   sample: ticker=${m.ticker} title="${m.title}" sport=${m._sport} event=${m.event_ticker}`))
  }
  return { markets: all, error: fetchError } as any
}

// ── Match pick to market + determine side ─────────────────────────────────────
// Kalshi format: ticker = KXNBAGAME-26FEB24ORLLAL-ORL  (suffix = team code)
//                title  = "Orlando at Los Angeles L Winner?"  (same for both markets in event)
// Both markets in an event share the same title — suffix is the differentiator for pro teams.
// For college teams (NCAAB/NCAAF) there is no ABBREV_MAP entry; use title word overlap instead.

// Helper: does a team name match any keyword in the ABBREV_MAP for a given suffix?
function teamMatchesSuffix(teamLower: string, suffix: string): boolean {
  const kws = ABBREV_MAP[suffix] || []
  if (kws.some(kw => teamLower.includes(kw))) return true
  // Fallback: suffix itself must match a whole word in the team name (not a substring)
  // e.g. "utsa" must NOT match "tulsa" — use word boundary check
  const sfxLower = suffix.toLowerCase()
  const teamWords = teamLower.split(/\s+/)
  return teamWords.some(w => w === sfxLower)
}

// Helper: does the market title contain both teams from the pick?
// Uses ABBREV_MAP for pro teams, word overlap for college teams.
function titleMatchesBothTeams(title: string, homeLower: string, awayLower: string, markets: any[]): boolean {
  // For pro teams: check if any market in the event has a suffix matching home AND another matching away
  const suffixes = markets.map(m => tickerSuffix(m.ticker))
  const homeMatched = suffixes.some(sfx => teamMatchesSuffix(homeLower, sfx))
  const awayMatched = suffixes.some(sfx => teamMatchesSuffix(awayLower, sfx))
  if (homeMatched && awayMatched) return true
  // For college teams: check title word overlap with both home and away
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

  console.log(`[match] Pick: "${pick.pick}" sport=${pickSport} | total markets=${markets.length} sport-filtered=${sportMarkets.length}`)

  // Group markets by event_ticker first — each event = one game
  const eventGroups = new Map<string, any[]>()
  for (const m of sportMarkets) {
    const ek = m.event_ticker || m.ticker
    if (!eventGroups.has(ek)) eventGroups.set(ek, [])
    eventGroups.get(ek)!.push(m)
  }

  console.log(`[match] Event groups: ${eventGroups.size}`)

  // Sort event groups: GAME (winner) first, then SPREAD, then TOTAL
  // This ensures we match winner markets before spread/total for the same game
  const sortedGroups = [...eventGroups.entries()].sort(([a], [b]) => {
    const priority = (ek: string) => {
      const u = ek.toUpperCase()
      if (u.includes('GAME')) return 0
      if (u.includes('SPREAD')) return 1
      if (u.includes('TOTAL')) return 2
      return 3
    }
    return priority(a) - priority(b)
  })

  // Find the event whose markets match BOTH teams from the pick
  let checked = 0
  for (const [ek, group] of sortedGroups) {
    const title = (group[0].title || '').toLowerCase().replace(/winner\?/g, '')
    if (!titleMatchesBothTeams(title, homeLower, awayLower, group)) continue
    checked++
    console.log(`[match] BOTH-TEAMS HIT: event=${ek} title="${title}" suffixes=${group.map(m => tickerSuffix(m.ticker)).join(',')}`)

    // Correct game found — now pick the market for the specific pick team
    // Strategy 1: ticker suffix → ABBREV_MAP (pro teams)
    for (const m of group) {
      const kws = ABBREV_MAP[tickerSuffix(m.ticker)] || []
      if (kws.some(kw => pickLower.includes(kw))) return m
    }
    // Strategy 2: suffix appears in pick team name (college teams)
    for (const m of group) {
      const sfx = tickerSuffix(m.ticker).toLowerCase()
      if (pickLower.includes(sfx)) return m
    }
    // Strategy 3: title position — "AWAY at HOME" — pick team before/after "at"
    const atIdx = title.indexOf(' at ')
    if (atIdx > 0) {
      const awayPart = title.substring(0, atIdx)
      const pickWords = pickLower.split(/\s+/).filter(w => w.length >= 4)
      const pickIsAway = pickWords.some(w => awayPart.includes(w))
      // Find the market whose suffix matches away (first part) or home (second part)
      for (const m of group) {
        const sfx = tickerSuffix(m.ticker)
        const sfxKws = ABBREV_MAP[sfx] || []
        const sfxMatchesAway = sfxKws.some(kw => awayLower.includes(kw)) || awayLower.includes(sfx.toLowerCase())
        if (pickIsAway && sfxMatchesAway) return m
        if (!pickIsAway && !sfxMatchesAway) return m
      }
    }
    // Last resort: return first market in the correct game
    return group[0]
  }
  console.log(`[match] NO MATCH for "${pick.pick}" (${pickSport}). sportMarkets=${sportMarkets.length} eventGroups=${eventGroups.size} bothTeamsHits=${checked}`)
  if (sportMarkets.length > 0 && sportMarkets.length <= 10) {
    sportMarkets.forEach(m => console.log(`[match]   sample: ticker=${m.ticker} title="${m.title}" sport=${m._sport}`))
  } else if (sportMarkets.length > 10) {
    sportMarkets.slice(0, 5).forEach(m => console.log(`[match]   sample: ticker=${m.ticker} title="${m.title}" sport=${m._sport}`))
  }
  return null
}

function determineSide(pick: any, market: any): 'yes' | 'no' {
  const pickLower = (pick.pick || '').toLowerCase()
  const sfx = tickerSuffix(market.ticker)

  // Pro teams: ABBREV_MAP
  const kws = ABBREV_MAP[sfx] || []
  if (kws.length > 0) return kws.some(kw => pickLower.includes(kw)) ? 'yes' : 'no'

  // College teams: check if ticker suffix appears in pick team name
  if (pickLower.includes(sfx.toLowerCase())) return 'yes'

  // Fallback: check title position — "AWAY at HOME Winner?" format
  // The away team is named first (before "at")
  const title = (market.title || '').toLowerCase()
  const atIdx = title.indexOf(' at ')
  if (atIdx > 0) {
    const awayPart = title.substring(0, atIdx)
    const awayLower = (pick.away_team || '').toLowerCase()
    const pickWords = pickLower.split(/\s+/).filter((w: string) => w.length >= 4)
    const awayIsYes = pickWords.some((w: string) => awayPart.includes(w))
    // If pick = away team and away is in the first part, YES; else NO
    if (awayIsYes) return 'yes'
  }
  return 'no'
}

// ── Place order ───────────────────────────────────────────────────────────────
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
  if (!res.ok) throw new Error(`Order failed ${res.status}: ${text}`)
  return j
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: any = {}
  try { body = await request.json() } catch { /* empty body ok */ }
  const auth = isAuthorized(request, body?.secret)
  if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const base = getBaseUrl(request)
    const settings = await loadSettings(base, `Bearer ${auth.token}`)

    const apiKeyId = process.env.KALSHI_API_KEY_ID || ''
    const rawKey = process.env.KALSHI_PRIVATE_KEY || ''
    const privateKey = rawKey ? normalizePem(rawKey) : ''
    const configured = !!(apiKeyId && privateKey && privateKey.includes('PRIVATE KEY'))

    const today = new Date().toISOString().split('T')[0]
    const minConf = settings.minConfidence || 57
    const maxPicks = settings.maxPicksPerDay || 20
    const stakeCents = Math.max(1, Math.floor(settings.stakeCents || 500))

    // Load best picks from BOTH regular + early predictions files
    const picks = loadBestPicks(today, minConf, maxPicks)

    if (picks.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No picks found in predictions-${today}.json or predictions-early-${today}.json with confidence >= ${minConf}%. Run predictions first.`,
        dryRun: settings.dryRun,
        configured,
      }, { status: 404 })
    }

    // Fetch open Kalshi markets once
    let openMarkets: any[] = []
    let marketFetchError: string | null = null
    if (configured) {
      const fetched = await fetchSportsMarkets(apiKeyId, privateKey)
      openMarkets = fetched.markets
      marketFetchError = fetched.error
    } else {
      marketFetchError = `Not configured: apiKeyId=${!!apiKeyId} privateKey=${!!privateKey} pemValid=${privateKey.includes('PRIVATE KEY')}`
    }

    const results: any[] = []

    for (const pick of picks) {
      const result: any = {
        pick: pick.pick,
        game: `${pick.away_team || ''} @ ${pick.home_team || ''}`,
        sport: pick.sport,
        confidence: pick.confidence,
        source: pick._source,
      }

      const market = matchPickToMarket(pick, openMarkets)
      if (!market) {
        result.status = 'no_market'
        result.note = 'No matching Kalshi market found'
        results.push(result)
        continue
      }

      const side = determineSide(pick, market)
      const price = side === 'yes' ? (market.yes_ask || 50) : (market.no_ask || 50)
      const count = Math.max(1, Math.floor(stakeCents / Math.max(1, price)))

      result.ticker = market.ticker
      result.marketTitle = market.title
      result.side = side
      result.price = price
      result.contracts = count
      result.estimatedCost = `$${((count * price) / 100).toFixed(2)}`

      if (settings.dryRun || !configured || !settings.enabled) {
        result.status = 'dry_run'
        result.note = `Would buy ${count} ${side.toUpperCase()} @ ${price}¢ on ${market.ticker}`
        results.push(result)
        continue
      }

      try {
        const order: Record<string, any> = {
          ticker: market.ticker,
          client_order_id: `auto_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          side,
          action: 'buy',
          count,
          type: 'limit',
        }
        if (side === 'yes') order.yes_price = price; else order.no_price = price
        const placed = await placeOrder(apiKeyId, privateKey, order)
        result.status = 'submitted'
        result.orderId = placed?.order?.order_id || placed?.id || null
        results.push(result)
      } catch (e: any) {
        result.status = 'error'
        result.error = e.message
        results.push(result)
      }
    }

    const submitted = results.filter(r => r.status === 'submitted').length
    const dryRuns = results.filter(r => r.status === 'dry_run').length
    const noMarket = results.filter(r => r.status === 'no_market').length
    const errors = results.filter(r => r.status === 'error').length
    const statusBreakdown = results.map(r => `${r.pick?.slice(0, 15)}=${r.status}`).join(', ')
    console.log(`[execute] RESPONSE: submitted=${submitted} dryRuns=${dryRuns} noMarket=${noMarket} errors=${errors} | ${statusBreakdown}`)

    return NextResponse.json({
      success: true,
      configured,
      dryRun: settings.dryRun || !settings.enabled,
      today,
      totalPicks: picks.length,
      submitted,
      dryRuns,
      noMarket,
      errors,
      stakePerPick: `$${(stakeCents / 100).toFixed(2)}`,
      debug: {
        marketsFetched: openMarkets.length,
        marketFetchError,
        sampleMarkets: openMarkets.map(m => ({ ticker: m.ticker, title: m.title, sport: m._sport })),
        samplePicks: picks.slice(0, 3).map(p => ({ pick: p.pick, home: p.home_team, away: p.away_team })),
      },
      results,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}
