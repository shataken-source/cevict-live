/**
 * Preview picks matched to Kalshi markets.
 * Returns all picks with their matched market info so the admin UI
 * can display them in a checkbox popup for manual bet selection.
 *
 * POST /api/progno/admin/trading/preview
 * Body: { secret }
 * Returns: { success, picks: PreviewPick[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// ── Auth ──────────────────────────────────────────────────────────────────────
function isAuthorized(request: NextRequest, bodySecret?: string): boolean {
  const SECRET = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || ''
  if (!SECRET) return false
  const auth = request.headers.get('authorization') || ''
  const headerSecret = request.headers.get('x-admin-secret') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : headerSecret
  const candidates = [token, bodySecret].filter(Boolean)
  return candidates.some(t => t === SECRET)
}

// ── Load picks ────────────────────────────────────────────────────────────────
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
  regularPicks.forEach(p => { p._source = 'regular' })
  earlyPicks.forEach(p => { p._source = 'early' })

  const seen = new Map<string, any>()
  for (const p of [...regularPicks, ...earlyPicks]) {
    const key = p.game_id || p.id || `${p.home_team}|${p.away_team}`
    if (!key) continue
    if (!seen.has(key)) seen.set(key, p)
    else {
      const existing = seen.get(key)!
      if ((p.confidence || 0) > (existing.confidence || 0)) seen.set(key, p)
    }
  }

  return Array.from(seen.values())
    .filter(p => (p.confidence || 0) >= minConfidence)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, maxPicks)
}

// ── Kalshi signing (reused from execute/route.ts) ─────────────────────────────
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

// ── Market matching (reused from execute/route.ts) ────────────────────────────
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

const GAME_SERIES: Array<{ prefix: string; sport: string }> = [
  { prefix: 'KXNBAGAME', sport: 'NBA' },
  { prefix: 'KXNCAAMBGAME', sport: 'NCAAB' },
  { prefix: 'KXNCAABGAME', sport: 'NCAAB' },
  { prefix: 'KXNFLGAME', sport: 'NFL' },
  { prefix: 'KXNHLGAME', sport: 'NHL' },
  { prefix: 'KXSHLGAME', sport: 'NHL' },
  { prefix: 'KXMLBGAME', sport: 'MLB' },
  { prefix: 'KXNCAAFGAME', sport: 'NCAAF' },
  { prefix: 'KXUNRIVALEDGAME', sport: 'NBA' },
  { prefix: 'KXNCAAMBSPREAD', sport: 'NCAAB' },
  { prefix: 'KXNBASPREAD', sport: 'NBA' },
  { prefix: 'KXNFLSPREAD', sport: 'NFL' },
  { prefix: 'KXNHLSPREAD', sport: 'NHL' },
  { prefix: 'KXNCAAMBTOTAL', sport: 'NCAAB' },
  { prefix: 'KXNBATOTAL', sport: 'NBA' },
  { prefix: 'KXNFLTOTAL', sport: 'NFL' },
  { prefix: 'KXNHLTOTAL', sport: 'NHL' },
  { prefix: 'KXNCAABBGAME', sport: 'NCAAB' },
  { prefix: 'KXNCAABASEBALL', sport: 'NCAAB' },
  { prefix: 'KXCBGAME', sport: 'NCAAB' },
]

function tickerSuffix(ticker: string): string { return ticker.split('-').pop()!.toUpperCase() }

function normSport(s: string): string {
  const u = (s || '').toUpperCase()
  if (u.includes('NBA')) return 'NBA'
  if (u.includes('NCAAB') || u.includes('CBB') || u.includes('COLLEGE BASKETBALL')) return 'NCAAB'
  if (u.includes('NCAAF') || u.includes('CFB') || u.includes('COLLEGE FOOTBALL')) return 'NCAAF'
  if (u.includes('NFL')) return 'NFL'
  if (u.includes('NHL') || u.includes('HOCKEY')) return 'NHL'
  if (u.includes('NCAA') || u.includes('COLLEGE')) return 'NCAAB'
  if (u.includes('MLB') || (u.includes('BASEBALL') && !u.includes('NCAA'))) return 'MLB'
  return u
}

function teamMatchesSuffix(teamLower: string, suffix: string): boolean {
  const kws = ABBREV_MAP[suffix] || []
  if (kws.some(kw => teamLower.includes(kw))) return true
  const sfxLower = suffix.toLowerCase()
  return teamLower.split(/\s+/).some(w => w === sfxLower)
}

function titleMatchesBothTeams(title: string, homeLower: string, awayLower: string, markets: any[]): boolean {
  const suffixes = markets.map(m => tickerSuffix(m.ticker))
  const homeMatched = suffixes.some(sfx => teamMatchesSuffix(homeLower, sfx))
  const awayMatched = suffixes.some(sfx => teamMatchesSuffix(awayLower, sfx))
  if (homeMatched && awayMatched) return true
  const homeWords = homeLower.split(/\s+/).filter(w => w.length >= 4)
  const awayWords = awayLower.split(/\s+/).filter(w => w.length >= 4)
  return homeWords.some(w => title.includes(w)) && awayWords.some(w => title.includes(w))
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

  for (const [_ek, group] of sortedGroups) {
    const title = (group[0].title || '').toLowerCase().replace(/winner\?/g, '')
    if (!titleMatchesBothTeams(title, homeLower, awayLower, group)) continue
    for (const m of group) {
      const kws = ABBREV_MAP[tickerSuffix(m.ticker)] || []
      if (kws.some(kw => pickLower.includes(kw))) return m
    }
    for (const m of group) {
      if (pickLower.includes(tickerSuffix(m.ticker).toLowerCase())) return m
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

// ── Fetch sports markets ──────────────────────────────────────────────────────
async function fetchSportsMarkets(apiKeyId: string, privateKey: string): Promise<{ markets: any[]; error: string | null }> {
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
      const res = await fetch(`${KALSHI_BASE}${p}`, { headers: kalshiHdrs(apiKeyId, privateKey, 'GET', eventsPath) })
      if (!res.ok) {
        fetchError = `HTTP ${res.status}`
        if (res.status === 429) await sleep(2000)
        break
      }
      const d = await res.json()
      const events: any[] = d.events || []
      if (pg === 0 && events.length === 0) { fetchError = 'No events returned'; break }
      for (const ev of events) {
        if ((ev.category || '').toUpperCase() !== 'SPORTS') continue
        const et = (ev.event_ticker || '').toUpperCase()
        if (/NCAAWB|WNBA|WCBB|WOMEN/i.test(et)) continue
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
      fetchError = e?.message || 'fetch error'
      break
    }
  }
  return { markets: all, error: fetchError }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: any = {}
  try { body = await request.json() } catch {}
  if (!isAuthorized(request, body?.secret)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const apiKeyId = process.env.KALSHI_API_KEY_ID || ''
    const rawKey = process.env.KALSHI_PRIVATE_KEY || ''
    const privateKey = rawKey ? normalizePem(rawKey) : ''
    const configured = !!(apiKeyId && privateKey && privateKey.includes('PRIVATE KEY'))

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const picks = loadBestPicks(today, 50, 40) // lower threshold, more picks — user will select

    if (picks.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No picks found for ${today}. Run predictions first.`,
      }, { status: 404 })
    }

    let openMarkets: any[] = []
    let marketError: string | null = null
    if (configured) {
      const fetched = await fetchSportsMarkets(apiKeyId, privateKey)
      openMarkets = fetched.markets
      marketError = fetched.error
    } else {
      marketError = 'Kalshi not configured'
    }

    const defaultStake = 500 // $5.00 default
    const previewPicks = picks.map(pick => {
      const market = matchPickToMarket(pick, openMarkets)
      const side = market ? determineSide(pick, market) : null
      const price = market ? (side === 'yes' ? (market.yes_ask || 50) : (market.no_ask || 50)) : null
      const contracts = price ? Math.max(1, Math.floor(defaultStake / Math.max(1, price))) : null

      return {
        // Pick info
        pick: pick.pick,
        home_team: pick.home_team,
        away_team: pick.away_team,
        sport: normSport(pick.league || pick.sport || ''),
        league: pick.league || pick.sport,
        confidence: pick.confidence,
        odds: pick.odds,
        expected_value: pick.expected_value,
        is_home_pick: pick.is_home_pick ?? (pick.pick === pick.home_team),
        source: pick._source,
        // Market info
        matched: !!market,
        ticker: market?.ticker || null,
        market_title: market?.title || null,
        side,
        price,
        contracts,
        estimated_cost_cents: price && contracts ? price * contracts : null,
        // Default stake for UI
        default_stake_cents: defaultStake,
      }
    })

    return NextResponse.json({
      success: true,
      date: today,
      totalPicks: previewPicks.length,
      matched: previewPicks.filter(p => p.matched).length,
      unmatched: previewPicks.filter(p => !p.matched).length,
      marketsFetched: openMarkets.length,
      marketError,
      picks: previewPicks,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed' }, { status: 500 })
  }
}
