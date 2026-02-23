/**
 * PROGNO → KALSHI AUTO-EXECUTOR
 * Watches for new progno predictions files and:
 *   1. Sells ALL long-term positions (expiry > 14 days) to free capital
 *   2. Matches each pick to a Kalshi sports market
 *   3. Buys $5 on every matched pick (limit order)
 *
 * Usage:
 *   npx tsx src/progno-kalshi-executor.ts           # watch mode
 *   npx tsx src/progno-kalshi-executor.ts --once    # single run
 *   npx tsx src/progno-kalshi-executor.ts --dry-run # simulate only
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

const alphaRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(alphaRoot, '.env.local'), override: true });
// NOTE: Do NOT load .env here — it contains a stale inline KALSHI_PRIVATE_KEY that
// would override the path-based key from .env.local (even with override:false, it fills
// empty vars). .env.local is the single authoritative source for this app.

const STAKE_PER_PICK = 5;
const SELL_LONG_TERM_DAYS = 14;
const WATCH_INTERVAL_MS = 60_000;
// predictions-YYYY-MM-DD.json is written to apps/progno/.progno/ by run-progno-today.ts
const PROGNO_APP_DIR = path.resolve(alphaRoot, '..', 'progno');
const PROGNO_DIR = fs.existsSync(path.join(PROGNO_APP_DIR, '.progno'))
  ? path.join(PROGNO_APP_DIR, '.progno')
  : PROGNO_APP_DIR;
const LOG_FILE = path.join(alphaRoot, 'progno-executor.log');
const EXECUTED_FILE = path.join(alphaRoot, 'progno-executor-executed.json');
const BASE_URL = 'https://api.elections.kalshi.com';
const GAME_SERIES: Array<{ ticker: string; sport: string }> = [
  { ticker: 'KXNBAGAME', sport: 'NBA' },
  { ticker: 'KXNCAAMBGAME', sport: 'NCAAB' },
  { ticker: 'KXNCAABBGAME', sport: 'NCAAB' },
  { ticker: 'KXNFLGAME', sport: 'NFL' },
  { ticker: 'KXNHLGAME', sport: 'NHL' },
  { ticker: 'KXMLBGAME', sport: 'MLB' },
  { ticker: 'KXNCAAFGAME', sport: 'NCAAF' },
  { ticker: 'KXNCAAMBSPREAD', sport: 'NCAAB' },
  { ticker: 'KXNCAAMBTOTAL', sport: 'NCAAB' },
  { ticker: 'KXNBASPREAD', sport: 'NBA' },
  { ticker: 'KXNBATOTAL', sport: 'NBA' },
  { ticker: 'KXNHLSPREAD', sport: 'NHL' },
  { ticker: 'KXNHLTOTAL', sport: 'NHL' },
];
const DRY_RUN = process.argv.includes('--dry-run');
const ONCE = process.argv.includes('--once');

interface PrognoPick {
  id?: string; game_id?: string; sport: string; league: string;
  home_team: string; away_team: string; pick: string; pick_type: string;
  odds: number; confidence: number; mc_win_probability?: number;
}

interface KalshiMarket {
  ticker: string; title: string; subtitle?: string;
  yes_ask: number; yes_bid: number; no_ask: number; no_bid: number;
  close_time?: string; _sport?: string;
}

interface ExecResult {
  pick: string; ticker: string; side: 'YES' | 'NO'; stake: number;
  priceCents: number; contracts: number; orderId?: string;
  status: 'placed' | 'simulated' | 'skipped' | 'error'; reason?: string;
}

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function loadExecuted(): Set<string> {
  try {
    if (fs.existsSync(EXECUTED_FILE)) {
      const d = JSON.parse(fs.readFileSync(EXECUTED_FILE, 'utf8'));
      return new Set(Array.isArray(d) ? d : []);
    }
  } catch { }
  return new Set();
}

function saveExecuted(ids: Set<string>) {
  try { fs.writeFileSync(EXECUTED_FILE, JSON.stringify([...ids], null, 2)); } catch { }
}

// Kalshi ticker suffix → team name keywords
// Ticker format: KXNBAGAME-26FEB21HOUNYK-NYK  (last segment = team code)
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
};

function tickerSuffix(ticker: string): string {
  const parts = ticker.split('-');
  return parts[parts.length - 1].toUpperCase();
}

function normSport(s: string): string {
  const u = (s || '').toUpperCase();
  if (u.includes('NBA')) return 'NBA';
  if (u === 'NCAA' || u.includes('NCAAB') || u.includes('CBB') || u.includes('COLLEGE BASKETBALL')) return 'NCAAB';
  if (u.includes('NCAAF') || u.includes('CFB') || u.includes('COLLEGE FOOTBALL')) return 'NCAAF';
  if (u.includes('NFL')) return 'NFL';
  if (u.includes('NHL') || u.includes('HOCKEY')) return 'NHL';
  if (u.includes('MLB') || u.includes('BASEBALL')) return 'MLB';
  return u;
}

function matchPickToMarket(pick: PrognoPick, markets: KalshiMarket[]): KalshiMarket | null {
  const pickLower = pick.pick.toLowerCase();
  const homeLower = (pick.home_team || '').toLowerCase();
  const awayLower = (pick.away_team || '').toLowerCase();
  const pickSport = normSport(pick.league || pick.sport || '');

  // Only search markets of the same sport (when tagged)
  const sportMarkets = markets.filter(m => !m._sport || m._sport === pickSport);

  // Strategy 1: ticker suffix → keyword map
  for (const m of sportMarkets) {
    const kws = ABBREV_MAP[tickerSuffix(m.ticker)] || [];
    if (kws.some(kw => pickLower.includes(kw))) return m;
  }

  // Strategy 2: title word overlap
  const pickWords = pickLower.split(/\s+/).filter(w => w.length >= 4);
  const ctxWords = (homeLower + ' ' + awayLower).split(/\s+/).filter(w => w.length >= 4);
  for (const m of sportMarkets) {
    if (m.title.includes(',')) continue;
    const t = m.title.toLowerCase().replace(/winner\?|at |vs\.? /g, ' ');
    const hits = pickWords.filter(w => t.includes(w)).length;
    if (hits >= 2) return m;
    if (hits >= 1 && ctxWords.some(w => t.includes(w))) return m;
  }
  return null;
}

function determineSide(pick: PrognoPick, market: KalshiMarket): 'YES' | 'NO' {
  const kws = ABBREV_MAP[tickerSuffix(market.ticker)] || [];
  return kws.some(kw => pick.pick.toLowerCase().includes(kw)) ? 'YES' : 'NO';
}

// ── Kalshi API client ─────────────────────────────────────────────────────────
class KalshiClient {
  private apiKeyId: string;
  private privateKey: string;
  readonly isConfigured: boolean;

  constructor() {
    this.apiKeyId = (process.env.KALSHI_API_KEY_ID || '').trim();
    let raw = (process.env.KALSHI_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/^"+|"+$/g, '').trim();
    const kp = (process.env.KALSHI_PRIVATE_KEY_PATH || '').trim();
    if (!raw && kp && fs.existsSync(kp)) raw = fs.readFileSync(kp, 'utf8').trim();
    if (raw.includes('-----BEGIN RSA PRIVATE KEY-----') && !raw.includes('\n')) {
      const B = '-----BEGIN RSA PRIVATE KEY-----', E = '-----END RSA PRIVATE KEY-----';
      const body = raw.substring(raw.indexOf(B) + B.length, raw.indexOf(E));
      raw = `${B}\n${(body.match(/.{1,64}/g) || []).join('\n')}\n${E}`;
    }
    this.privateKey = raw;
    if (this.apiKeyId && raw.includes('BEGIN') && raw.includes('PRIVATE KEY')) {
      try {
        crypto.createPrivateKey(raw);
        this.isConfigured = true;
        log(`✅ Kalshi configured (${this.apiKeyId.substring(0, 8)}...)`);
      }
      catch (e: any) { log(`❌ Bad private key: ${e.message}`); this.isConfigured = false; }
    } else { log('⚠️  Kalshi keys missing — DRY-RUN only'); this.isConfigured = false; }
  }

  private async sign(method: string, urlPath: string) {
    const ts = Date.now().toString();
    const msg = ts + method.toUpperCase() + urlPath.split('?')[0];
    try {
      const s = crypto.createSign('RSA-SHA256');
      s.update(msg); s.end();
      const sig = s.sign({ key: this.privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST }).toString('base64');
      return { sig, ts };
    } catch { return { sig: '', ts: '' }; }
  }

  private hdrs(sig: string, ts: string) {
    return { 'Content-Type': 'application/json', 'KALSHI-ACCESS-KEY': this.apiKeyId, 'KALSHI-ACCESS-SIGNATURE': sig, 'KALSHI-ACCESS-TIMESTAMP': ts };
  }

  async getBalance(): Promise<number> {
    if (!this.isConfigured) return 9999;
    try {
      const p = '/trade-api/v2/portfolio/balance';
      const { sig, ts } = await this.sign('GET', p);
      const r = await fetch(`${BASE_URL}${p}`, { headers: this.hdrs(sig, ts) });
      if (r.status === 401) { log('⚠️  Balance 401 — proceeding anyway'); return -1; }
      if (!r.ok) return -1;
      return ((await r.json()).balance || 0) / 100;
    } catch { return -1; }
  }

  async fetchSportsMarkets(): Promise<KalshiMarket[]> {
    if (!this.isConfigured) return [];
    const all: KalshiMarket[] = [];

    // Try series_ticker per sport first (fast path)
    for (const { ticker: seriesTicker, sport } of GAME_SERIES) {
      try {
        let cursor: string | undefined;
        let seriesTotal = 0;
        for (let pg = 0; pg < 5; pg++) {
          const params = new URLSearchParams({ series_ticker: seriesTicker, status: 'open', limit: '200' });
          if (cursor) params.set('cursor', cursor);
          const p = `/trade-api/v2/markets?${params}`;
          const { sig, ts } = await this.sign('GET', p);
          const r = await fetch(`${BASE_URL}${p}`, { headers: this.hdrs(sig, ts) });
          if (!r.ok) { if (r.status === 429) await sleep(2000); break; }
          const d = await r.json();
          const ms: KalshiMarket[] = (d.markets || []).map((m: KalshiMarket) => ({ ...m, _sport: sport }));
          all.push(...ms); seriesTotal += ms.length; cursor = d.cursor;
          if (ms.length < 200 || !cursor) break;
          await sleep(200);
        }
        if (seriesTotal > 0) log(`   ✅ ${seriesTicker}: ${seriesTotal} markets`);
      } catch (e: any) { log(`⚠️  ${seriesTicker}: ${e.message}`); }
    }

    // If series_ticker returned nothing (API format issue), fall back to broad fetch
    // filtered by known game ticker prefixes
    if (all.length === 0) {
      log('⚠️  series_ticker returned 0 markets — falling back to broad fetch with prefix filter');
      const sportPrefixes = GAME_SERIES.map(s => s.ticker.toUpperCase());
      try {
        let cursor: string | undefined;
        for (let pg = 0; pg < 15; pg++) {
          const params = new URLSearchParams({ status: 'open', limit: '1000' });
          if (cursor) params.set('cursor', cursor);
          const p = `/trade-api/v2/markets?${params}`;
          const { sig, ts } = await this.sign('GET', p);
          const r = await fetch(`${BASE_URL}${p}`, { headers: this.hdrs(sig, ts) });
          if (!r.ok) { if (r.status === 429) await sleep(2000); break; }
          const d = await r.json();
          const page: KalshiMarket[] = d.markets || [];
          // Keep only game-winner markets matching known sport series prefixes
          const sports = page.filter(m => {
            const t = (m.ticker || '').toUpperCase();
            return sportPrefixes.some(pfx => t.startsWith(pfx));
          }).map(m => {
            const sport = GAME_SERIES.find(s => m.ticker.toUpperCase().startsWith(s.ticker.toUpperCase()))?.sport;
            return { ...m, _sport: sport };
          });
          all.push(...sports);
          cursor = d.cursor;
          if (page.length < 1000 || !cursor) break;
          await sleep(150);
        }
        log(`   Broad fetch found ${all.length} sports markets`);
      } catch (e: any) { log(`❌ Broad fetch failed: ${e.message}`); }
    }

    log(`📡 Fetched ${all.length} total sports markets`);
    return all;
  }

  async getOpenPositions(): Promise<Array<{ ticker: string; position: number; close_time?: string }>> {
    if (!this.isConfigured) return [];
    try {
      const p = '/trade-api/v2/portfolio/positions';
      const { sig, ts } = await this.sign('GET', p);
      const r = await fetch(`${BASE_URL}${p}`, { headers: this.hdrs(sig, ts) });
      if (!r.ok) return [];
      return ((await r.json()).market_positions || []).map((p: any) => ({ ticker: p.ticker, position: Number(p.position || 0), close_time: p.market?.close_time }));
    } catch { return []; }
  }

  async getMarketCloseTime(ticker: string): Promise<string | null> {
    if (!this.isConfigured) return null;
    try {
      const p = `/trade-api/v2/markets/${ticker}`;
      const { sig, ts } = await this.sign('GET', p);
      const r = await fetch(`${BASE_URL}${p}`, { headers: this.hdrs(sig, ts) });
      if (!r.ok) return null;
      return (await r.json()).market?.close_time || null;
    } catch { return null; }
  }

  async sellPosition(ticker: string, contracts: number): Promise<boolean> {
    if (!this.isConfigured || DRY_RUN) { log(`   [DRY-RUN] sell ${contracts}x ${ticker}`); return true; }
    try {
      const obPath = `/trade-api/v2/markets/${ticker}/orderbook`;
      const { sig: os, ts: ot } = await this.sign('GET', obPath);
      const obR = await fetch(`${BASE_URL}${obPath}`, { headers: this.hdrs(os, ot) });
      let sp = 50;
      if (obR.ok) { const ob = await obR.json(); const bids = ob.yes?.bids || []; if (bids.length) sp = Math.max(1, bids[0].price - 1); }
      const p = '/trade-api/v2/portfolio/orders';
      const body = { ticker, side: 'yes', action: 'sell', count: Math.round(contracts), type: 'limit', yes_price: Math.round(sp) };
      const { sig, ts } = await this.sign('POST', p);
      const r = await fetch(`${BASE_URL}${p}`, { method: 'POST', headers: this.hdrs(sig, ts), body: JSON.stringify(body) });
      if (!r.ok) { log(`   ❌ Sell failed ${ticker}: ${r.status}`); return false; }
      const d = await r.json(); log(`   ✅ Sell: ${ticker} ${contracts}x @ ${sp}¢ | ${d.order?.order_id}`); return true;
    } catch (e: any) { log(`   ❌ Sell error ${ticker}: ${e.message}`); return false; }
  }

  async buyContracts(ticker: string, side: 'YES' | 'NO', usdStake: number, askCents: number): Promise<{ ok: boolean; orderId?: string; error?: string }> {
    const lp = Math.min(99, Math.max(1, Math.round(askCents)));
    const ct = Math.floor((usdStake * 100) / lp);
    if (ct <= 0) return { ok: false, error: `0 contracts at ${lp}¢` };
    if (!this.isConfigured || DRY_RUN) { log(`   [DRY-RUN] buy ${ct} ${side} ${ticker} @ ${lp}¢`); return { ok: true, orderId: 'dry-run' }; }
    try {
      const p = '/trade-api/v2/portfolio/orders';
      const body: Record<string, any> = { ticker, side: side.toLowerCase(), action: 'buy', count: ct, type: 'limit' };
      if (side === 'YES') body.yes_price = lp; else body.no_price = lp;
      const { sig, ts } = await this.sign('POST', p);
      const r = await fetch(`${BASE_URL}${p}`, { method: 'POST', headers: this.hdrs(sig, ts), body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) return { ok: false, error: JSON.stringify(d).substring(0, 200) };
      return { ok: true, orderId: d.order?.order_id };
    } catch (e: any) { return { ok: false, error: e.message }; }
  }
}

async function sellLongTermPositions(client: KalshiClient) {
  log('\n🔄 Checking long-term positions to sell...');
  const positions = await client.getOpenPositions();
  if (!positions.length) { log('   ℹ️  No open positions'); return; }
  log(`   Found ${positions.length} position(s)`);
  let sold = 0;
  for (const pos of positions) {
    if (pos.position <= 0) continue;
    let ct = pos.close_time || await client.getMarketCloseTime(pos.ticker);
    if (!ct) { log(`   ⚠️  No close_time for ${pos.ticker}`); continue; }
    const daysOut = (new Date(ct).getTime() - Date.now()) / 86400000;
    if (daysOut > SELL_LONG_TERM_DAYS) {
      log(`   📤 Sell ${pos.ticker}: ${pos.position}x, ${daysOut.toFixed(0)}d out`);
      if (await client.sellPosition(pos.ticker, pos.position)) sold++;
      await sleep(500);
    }
  }
  log(`   ✅ Sold ${sold} long-term position(s)`);
}

async function executePicks(picks: PrognoPick[], client: KalshiClient, markets: KalshiMarket[], executed: Set<string>): Promise<ExecResult[]> {
  const results: ExecResult[] = [];
  for (const pick of picks) {
    const pid = pick.id || pick.game_id || `${pick.sport}-${pick.home_team}-${pick.away_team}-${pick.pick}`;
    if (executed.has(pid)) { log(`   ⏭️  Skip (dup): ${pick.pick}`); results.push({ pick: pick.pick, ticker: '', side: 'YES', stake: 0, priceCents: 0, contracts: 0, status: 'skipped', reason: 'dup' }); continue; }
    const market = matchPickToMarket(pick, markets);
    if (!market) { log(`   ❌ No match: ${pick.pick} (${pick.sport}: ${pick.away_team} @ ${pick.home_team})`); results.push({ pick: pick.pick, ticker: '', side: 'YES', stake: 0, priceCents: 0, contracts: 0, status: 'skipped', reason: 'no match' }); continue; }
    const side = determineSide(pick, market);
    const ask = side === 'YES' ? market.yes_ask : market.no_ask;
    if (!ask || ask <= 0 || ask >= 100) { log(`   ⚠️  Bad ask ${ask}¢ for ${market.ticker}`); results.push({ pick: pick.pick, ticker: market.ticker, side, stake: 0, priceCents: ask, contracts: 0, status: 'skipped', reason: `bad price ${ask}¢` }); continue; }
    const ct = Math.floor((STAKE_PER_PICK * 100) / ask);
    log(`   🎯 ${pick.pick} → ${market.ticker} | ${side} @ ${ask}¢ | ${ct}x ($${STAKE_PER_PICK})`);
    const { ok, orderId, error } = await client.buyContracts(market.ticker, side, STAKE_PER_PICK, ask);
    if (ok) { executed.add(pid); log(`   ✅ Placed: ${market.ticker} ${side} | ${orderId}`); results.push({ pick: pick.pick, ticker: market.ticker, side, stake: STAKE_PER_PICK, priceCents: ask, contracts: ct, orderId, status: DRY_RUN ? 'simulated' : 'placed' }); }
    else { log(`   ❌ Failed: ${market.ticker} — ${error}`); results.push({ pick: pick.pick, ticker: market.ticker, side, stake: STAKE_PER_PICK, priceCents: ask, contracts: ct, status: 'error', reason: error }); }
    await sleep(600);
  }
  return results;
}

function todayDateStr(): string {
  const tz = (process.env.ALPHA_TIMEZONE || 'America/Chicago').trim();
  // Use Intl to get the correct local date in the configured timezone (handles DST)
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return parts; // en-CA format is YYYY-MM-DD
}

function findLatestPredictionsFile(): string | null {
  if (!fs.existsSync(PROGNO_DIR)) return null;
  const files = fs.readdirSync(PROGNO_DIR).filter(f => /^predictions-\d{4}-\d{2}-\d{2}\.json$/.test(f) && !f.includes('early')).sort().reverse();
  for (const f of files) { const fp = path.join(PROGNO_DIR, f); if (fs.statSync(fp).size > 100) return fp; }
  return null;
}

async function fetchPicksFromSupabaseStorage(date: string): Promise<PrognoPick[]> {
  const supaUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supaKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supaUrl || !supaKey) { log('⚠️  Supabase env vars not set — cannot fetch from storage'); return []; }
  const hdrs = { apikey: supaKey, Authorization: `Bearer ${supaKey}` };
  const base = `${supaUrl}/storage/v1/object/predictions`;
  for (const fileName of [`predictions-${date}.json`, `predictions-early-${date}.json`]) {
    try {
      const r = await fetch(`${base}/${fileName}`, { headers: hdrs });
      if (!r.ok) continue;
      const parsed = await r.json();
      const picks: PrognoPick[] = parsed.picks || parsed;
      if (Array.isArray(picks) && picks.length > 0) {
        log(`📦 Loaded ${picks.length} picks from Supabase Storage (${fileName})`);
        return picks;
      }
    } catch { /* try next */ }
  }
  return [];
}

async function run(client: KalshiClient, lastFile: string | null): Promise<string | null> {
  const file = findLatestPredictionsFile();
  const today = todayDateStr();

  let picks: PrognoPick[] = [];
  let fileKey: string;

  if (!file) {
    log(`⚠️  No local predictions file — fetching from Supabase Storage (${today})...`);
    picks = await fetchPicksFromSupabaseStorage(today);
    if (!picks.length) { log('❌ No picks found locally or in Supabase Storage'); return lastFile; }
    fileKey = `supabase:${today}`;
  } else {
    if (file === lastFile) { log(`ℹ️  No new file (${path.basename(file)})`); return lastFile; }
    log(`\n${'═'.repeat(68)}\n🚀 NEW FILE: ${path.basename(file)}\n${'═'.repeat(68)}`);
    try { picks = (JSON.parse(fs.readFileSync(file, 'utf8'))).picks || []; }
    catch (e: any) { log(`❌ Parse error: ${e.message}`); return lastFile; }
    fileKey = file;
  }

  if (fileKey === lastFile) { log(`ℹ️  Already processed ${fileKey}`); return lastFile; }
  log(`\n${'═'.repeat(68)}\n🚀 SOURCE: ${fileKey}\n${'═'.repeat(68)}`);

  // reassign file to fileKey for return value tracking
  const resolvedFile = fileKey;

  if (!picks.length) { log('⚠️  No picks'); return resolvedFile; }
  log(`📊 Loaded ${picks.length} picks`);

  const bal = await client.getBalance();
  log(bal >= 0 ? `💰 Balance: $${bal.toFixed(2)}` : '💰 Balance: unknown (401 — proceeding)');

  await sellLongTermPositions(client);

  log('\n📡 Fetching Kalshi sports markets...');
  const markets = await client.fetchSportsMarkets();
  if (!markets.length && client.isConfigured) { log('❌ No markets — aborting'); return resolvedFile; }

  log(`\n🎯 Executing ${picks.length} picks @ $${STAKE_PER_PICK} each...`);
  const executed = loadExecuted();
  const results = await executePicks(picks, client, markets, executed);
  if (!DRY_RUN) saveExecuted(executed);

  const placed = results.filter(r => r.status === 'placed' || r.status === 'simulated');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');
  log(`\n${'─'.repeat(68)}\n📊 SUMMARY\n${'─'.repeat(68)}`);
  log(`   ✅ Placed:  ${placed.length} ($${placed.length * STAKE_PER_PICK})`);
  log(`   ⏭️  Skipped: ${skipped.length}`);
  log(`   ❌ Errors:  ${errors.length}`);
  if (DRY_RUN) log('   ⚠️  DRY-RUN — no real orders');
  log(`${'─'.repeat(68)}\n`);
  return resolvedFile;
}

async function main() {
  log(`\n${'═'.repeat(68)}\n  PROGNO → KALSHI AUTO-EXECUTOR\n  Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'} | $${STAKE_PER_PICK}/pick | Sell LT >${SELL_LONG_TERM_DAYS}d\n${'═'.repeat(68)}\n`);
  const client = new KalshiClient();
  if (ONCE) { await run(client, null); return; }
  let lastFile: string | null = null;
  log(`👁️  Watching every ${WATCH_INTERVAL_MS / 1000}s | dir: ${PROGNO_DIR}\n`);
  while (true) {
    try { lastFile = await run(client, lastFile); } catch (e: any) { log(`❌ Run error: ${e.message}`); }
    await sleep(WATCH_INTERVAL_MS);
  }
}

main().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
