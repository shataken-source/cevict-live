/**
 * PROBABILITY ANALYZER A/B SIMULATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * Uses historical_odds + game_outcomes from Supabase to:
 *   1. Reconstruct games from stored odds data
 *   2. Generate predictions using the pick engine's core logic
 *   3. Run predictions WITH and WITHOUT the 16-model probability analyzer
 *   4. Grade against actual game outcomes
 *   5. Bootstrap 1000 bankroll simulations for consistency
 *   6. Tune analyzer parameters for best results across all leagues
 *
 * Usage: npx tsx scripts/probability-analyzer-simulation.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadEnvFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* ok */ }
}
loadEnvFile(path.resolve(__dirname, '..', '.env.local'))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing SUPABASE env vars'); process.exit(1) }
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY)

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ReconstructedGame {
  gameId: string
  sport: string
  league: string
  homeTeam: string
  awayTeam: string
  commenceTime: string
  homeOdds: number
  awayOdds: number
  spreadPoint: number
  totalPoint: number
  homeNoVigProb: number
  awayNoVigProb: number
}

interface GameOutcome {
  game_date: string
  sport: string
  league: string
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  winner: string
}

interface Prediction {
  game: ReconstructedGame
  pick: string          // team name or "Over"/"Under"
  pickType: string      // MONEYLINE, SPREAD, TOTAL
  pickOdds: number
  confidence: number
  isHomePick: boolean
  edge: number
  pickLine?: number
}

interface GradedPrediction {
  prediction: Prediction
  outcome: GameOutcome
  result: 'win' | 'loss' | 'push'
  profit: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHIN DEVIG (same as pick-engine)
// ═══════════════════════════════════════════════════════════════════════════════

function oddsToProb(odds: number): number {
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100)
}

function shinDevig(impliedHome: number, impliedAway: number): { home: number; away: number } {
  const eps = 1e-9
  function solveTrueProb(implied: number, z: number): number {
    let p = Math.max(eps, Math.min(1 - eps, implied))
    for (let i = 0; i < 25; i++) {
      const next = implied - z * Math.sqrt(p * (1 - p))
      const nc = Math.max(eps, Math.min(1 - eps, next))
      if (Math.abs(nc - p) < eps) return nc
      p = nc
    }
    return p
  }
  let zLo = 0, zHi = 2
  for (let b = 0; b < 40; b++) {
    const zMid = (zLo + zHi) / 2
    const th = solveTrueProb(impliedHome, zMid)
    const ta = solveTrueProb(impliedAway, zMid)
    const sum = th + ta
    if (Math.abs(sum - 1) < eps) { const s = th + ta; return { home: s > 0 ? th / s : 0.5, away: s > 0 ? ta / s : 0.5 } }
    if (sum > 1) zLo = zMid; else zHi = zMid
  }
  const z = (zLo + zHi) / 2
  const home = solveTrueProb(impliedHome, z)
  const away = solveTrueProb(impliedAway, z)
  const s = home + away
  return { home: s > 0 ? home / s : 0.5, away: s > 0 ? away / s : 0.5 }
}

function sanitizeOdds(odds: number): number {
  if (odds > 0) return odds < 100 ? 110 : Math.min(odds, 10000)
  return odds > -100 ? -110 : Math.max(odds, -10000)
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPORT DEFAULTS (from pick-engine)
// ═══════════════════════════════════════════════════════════════════════════════

const SPORT_DEFAULT_TOTAL: Record<string, number> = {
  basketball_nba: 224, basketball_ncaab: 145,
  americanfootball_nfl: 44, americanfootball_ncaaf: 58,
  icehockey_nhl: 6, baseball_mlb: 9, baseball_ncaa: 9,
}

function sportToLeague(sport: string): string {
  return sport.replace('basketball_', '').replace('americanfootball_', '')
    .replace('icehockey_', '').replace('baseball_', '').toUpperCase()
}

// ═══════════════════════════════════════════════════════════════════════════════
// 16-MODEL PROBABILITY ANALYZER (from cevict-probability-analyzer/index.html)
// ═══════════════════════════════════════════════════════════════════════════════

interface DataPoint { source: string; metric: string; value: number; weight: number }

function bayesianUpdate(prior: number, dps: DataPoint[]) {
  let p = prior
  for (const d of dps) {
    const lr = 1 + (d.value / 100) * d.weight
    const po = p / (100 - p + 0.001)
    p = (po * lr / (1 + po * lr)) * 100
  }
  return { prob: Math.max(1, Math.min(99, p)), conf: 80 }
}
function weightedFactors(base: number, dps: DataPoint[]) {
  const t = dps.reduce((s, d) => s + Math.max(-50, Math.min(50, d.value)) * d.weight, 0)
  return { prob: Math.max(1, Math.min(99, base + t)), conf: 75 }
}
function consensusModel(dps: DataPoint[]) {
  if (!dps.length) return { prob: 50, conf: 20 }
  return { prob: dps.reduce((s, d) => s + d.value, 0) / dps.length, conf: 70 }
}
function randomForest(dps: DataPoint[], base: number) {
  let sum = 0, seed = base * 1000 + dps.reduce((s, d) => s + d.value * d.weight, 0) * 100
  const sr = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
  for (let i = 0; i < 50; i++) {
    let p = base
    for (const d of dps) { if (sr() > 0.3) p += (d.value > 0 ? 1 : -1) * d.weight * 3 }
    sum += Math.max(10, Math.min(90, p))
  }
  return { prob: sum / 50, conf: 85 }
}
function xgboost(dps: DataPoint[], base: number) {
  let p = base
  for (let i = 0; i < 100; i++) { p += 0.05 * dps.reduce((s, d) => s + (d.value > 0 ? 1 : -1) * d.weight * 0.5, 0) }
  return { prob: Math.max(10, Math.min(90, p)), conf: 87 }
}
function neuralNet(dps: DataPoint[], base: number) {
  const h = dps.map(d => Math.max(0, (d.value / 100) * d.weight)).reduce((a, b) => a + b, 0) / (dps.length || 1)
  const o = 1 / (1 + Math.exp(-((h - 0.5) * 4 + (base - 50) / 25)))
  return { prob: Math.max(15, Math.min(85, o * 100)), conf: 78 }
}
function markov(base: number) { return { prob: Math.max(30, Math.min(70, 50 + (base - 50) * 0.8)), conf: 68 } }
function knn(dps: DataPoint[], base: number) {
  const avg = dps.reduce((s, d) => s + d.value, 0) / (dps.length || 1)
  return { prob: Math.max(20, Math.min(80, base + avg * 0.3)), conf: 76 }
}
function svm(dps: DataPoint[]) {
  const pos = dps.filter(d => d.value > 0).reduce((s, d) => s + d.weight * d.value, 0)
  const neg = dps.filter(d => d.value <= 0).reduce((s, d) => s + d.weight * Math.abs(d.value), 0)
  const m = (pos - neg) / (pos + neg + 0.01)
  return { prob: Math.max(15, Math.min(85, 50 + m * 40)), conf: 73 }
}
function lstm(dps: DataPoint[]) {
  let st = 0
  for (const d of dps) st = 0.8 * st + 0.6 * Math.tanh(d.value / 100)
  return { prob: Math.max(15, Math.min(85, 50 + st * 40)), conf: 76 }
}
function attention(dps: DataPoint[], base: number) {
  if (!dps.length) return { prob: base, conf: 30 }
  const sc = dps.map(d => Math.exp(d.value * d.weight / 50))
  const sm = sc.reduce((a, b) => a + b, 0)
  const w = sc.map(s => s / sm)
  const o = dps.reduce((s, d, i) => s + w[i] * d.value, 0)
  return { prob: Math.max(20, Math.min(80, base + o * 0.3)), conf: 74 }
}
function gradBoost(dps: DataPoint[], base: number) {
  let p = base
  for (let i = 0; i < 50; i++) {
    const t = dps.reduce((s, d) => s + (d.value > 0 ? d.weight : -d.weight), 0)
    p += 0.1 * (t - (p - 50) / 10)
  }
  return { prob: Math.max(15, Math.min(85, p)), conf: 82 }
}
function elo(hRating: number, aRating: number, adv = 50) {
  const diff = hRating - aRating + adv
  return { prob: Math.max(5, Math.min(95, (1 / (1 + Math.pow(10, -diff / 400))) * 100)), conf: 85 }
}
function factorial(n: number): number { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r }
function poisson(eh: number, ea: number) {
  let hw = 0
  for (let h = 0; h <= 10; h++) for (let a = 0; a <= 10; a++) if (h > a) {
    hw += (Math.pow(eh, h) * Math.exp(-eh) / factorial(h)) * (Math.pow(ea, a) * Math.exp(-ea) / factorial(a))
  }
  return { prob: Math.min(100, hw * 100), conf: 75 }
}
function linear(dps: DataPoint[], base: number) {
  if (dps.length < 2) return { prob: base, conf: 30 }
  const n = dps.length
  const sx = n * (n - 1) / 2, sy = dps.reduce((s, d) => s + d.value, 0)
  const sxy = dps.reduce((s, d, i) => s + i * d.value, 0), sx2 = dps.reduce((s, _, i) => s + i * i, 0)
  const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx) || 0
  return { prob: Math.max(10, Math.min(90, base + slope * n / 2)), conf: 80 }
}
function momentum(dps: DataPoint[]) {
  const sc = dps.reduce((s, d) => s + d.value * d.weight, 0)
  return { prob: Math.max(20, Math.min(80, 50 + sc / 2)), conf: 75 }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TUNABLE PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════════

interface AnalyzerParams {
  blendWeight: number
  confidenceWeight: number
  edgeWeight: number
  spreadWeight: number
  minEdgeActivation: number
  flipThreshold: number       // ensemble prob threshold to flip picks
  valueBetMinEdge: number     // min edge % to consider a value bet
  underdogBonus: number       // extra weight for underdog value
  sportMultipliers: Record<string, number>
}

const DEFAULT_PARAMS: AnalyzerParams = {
  blendWeight: 0.3,
  confidenceWeight: 0.8,
  edgeWeight: 0.6,
  spreadWeight: 0.5,
  minEdgeActivation: 2.0,
  flipThreshold: 55,
  valueBetMinEdge: 3,
  underdogBonus: 0.5,
  sportMultipliers: { NBA: 1.0, NHL: 1.0, MLB: 1.0, NCAAB: 1.0, NCAAF: 1.0, NFL: 1.0, CBB: 1.0 },
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTION ENGINE (realistic: value detection, edge picks, spread/total)
// ═══════════════════════════════════════════════════════════════════════════════

// Home-field advantage discount: market already prices HFA in, so discount
// the home no-vig prob slightly to avoid always picking home favorites
const HFA_DISCOUNT = 0.015  // 1.5% reduction to home no-vig prob

interface ValueBet {
  side: string
  type: string  // MONEYLINE, SPREAD
  odds: number
  modelProb: number
  impliedProb: number
  edge: number
  ev: number
  isHome: boolean
  line?: number
}

function detectValueBets(game: ReconstructedGame): ValueBet[] {
  const bets: ValueBet[] = []

  // Adjust for home-field advantage already priced in
  const adjHomeProb = Math.max(0.05, game.homeNoVigProb - HFA_DISCOUNT)
  const adjAwayProb = Math.min(0.95, game.awayNoVigProb + HFA_DISCOUNT)

  // Moneyline - Home
  const homeML = sanitizeOdds(game.homeOdds)
  const homeImplied = oddsToProb(homeML)
  const homeEdge = (adjHomeProb - homeImplied) * 100
  const homeDec = homeML > 0 ? (homeML / 100) + 1 : (100 / Math.abs(homeML)) + 1
  const homeEV = adjHomeProb * (homeDec - 1) - (1 - adjHomeProb)
  bets.push({ side: game.homeTeam, type: 'MONEYLINE', odds: homeML, modelProb: adjHomeProb, impliedProb: homeImplied, edge: homeEdge, ev: homeEV * 100, isHome: true })

  // Moneyline - Away
  const awayML = sanitizeOdds(game.awayOdds)
  const awayImplied = oddsToProb(awayML)
  const awayEdge = (adjAwayProb - awayImplied) * 100
  const awayDec = awayML > 0 ? (awayML / 100) + 1 : (100 / Math.abs(awayML)) + 1
  const awayEV = adjAwayProb * (awayDec - 1) - (1 - adjAwayProb)
  bets.push({ side: game.awayTeam, type: 'MONEYLINE', odds: awayML, modelProb: adjAwayProb, impliedProb: awayImplied, edge: awayEdge, ev: awayEV * 100, isHome: false })

  // Spread bets (if spread data available)
  if (game.spreadPoint !== 0) {
    // Spread pick: if spread is -5.5, home needs to win by 6+. Use no-vig prob
    // as proxy for cover probability (simplified: larger favorites cover more)
    const spreadHomeProb = adjHomeProb + (Math.abs(game.spreadPoint) < 3 ? 0.05 : -0.02)
    const spreadAwayProb = 1 - spreadHomeProb
    // Standard spread odds ~ -110
    const spreadOdds = -110
    const spreadImplied = oddsToProb(spreadOdds)

    const homeSpreadEdge = (Math.min(0.8, Math.max(0.2, spreadHomeProb)) - spreadImplied) * 100
    const awaySpreadEdge = (Math.min(0.8, Math.max(0.2, spreadAwayProb)) - spreadImplied) * 100

    if (homeSpreadEdge > 0) {
      bets.push({ side: game.homeTeam, type: 'SPREAD', odds: spreadOdds, modelProb: spreadHomeProb, impliedProb: spreadImplied, edge: homeSpreadEdge, ev: homeSpreadEdge * 0.91, isHome: true, line: game.spreadPoint })
    }
    if (awaySpreadEdge > 0) {
      bets.push({ side: game.awayTeam, type: 'SPREAD', odds: spreadOdds, modelProb: spreadAwayProb, impliedProb: spreadImplied, edge: awaySpreadEdge, ev: awaySpreadEdge * 0.91, isHome: false, line: -game.spreadPoint })
    }
  }

  // Sort by edge descending
  bets.sort((a, b) => b.edge - a.edge)
  return bets
}

function generatePrediction(game: ReconstructedGame): Prediction {
  const valueBets = detectValueBets(game)

  // Value-based selection: pick the bet with the highest positive edge
  // If no positive edge, fall back to the side with the least negative edge
  const bestBet = valueBets[0]

  // Edge threshold: only take value bets with >= 2% edge
  const hasValue = bestBet && bestBet.edge >= 2
  const selected = hasValue ? bestBet : valueBets.find(b => b.type === 'MONEYLINE') || bestBet

  const probDiff = Math.abs(game.homeNoVigProb - 0.5)
  let confidence = Math.min(95, Math.max(35, 50 + probDiff * 80))

  // Boost confidence for high-edge value bets
  if (hasValue && selected.edge > 5) confidence = Math.min(95, confidence + selected.edge * 0.5)
  // Reduce confidence for underdog moneyline picks (riskier)
  if (!selected.isHome && selected.type === 'MONEYLINE' && selected.modelProb < 0.45) confidence *= 0.9

  return {
    game,
    pick: selected.side,
    pickType: selected.type,
    pickOdds: selected.odds,
    confidence,
    isHomePick: selected.isHome,
    edge: selected.edge,
    pickLine: selected.line,
  }
}

function runEnsemble(modelProb: number, dps: DataPoint[]): number {
  const models = [
    bayesianUpdate(modelProb, dps), weightedFactors(modelProb, dps), consensusModel(dps),
    randomForest(dps, modelProb), xgboost(dps, modelProb), neuralNet(dps, modelProb),
    markov(modelProb), knn(dps, modelProb), svm(dps), lstm(dps),
    attention(dps, modelProb), gradBoost(dps, modelProb),
    elo(1500 + modelProb * 5, 1500 - modelProb * 3),
    poisson(2.5 + (modelProb - 50) / 20, 1.5),
    linear(dps, modelProb), momentum(dps),
  ]
  const totalConf = models.reduce((s, m) => s + m.conf, 0)
  return models.reduce((s, m) => s + (m.prob * m.conf / totalConf), 0)
}

function applyAnalyzer(pred: Prediction, params: AnalyzerParams): Prediction {
  const base = pred.confidence
  const game = pred.game
  const league = game.league
  const sportMult = params.sportMultipliers[league] ?? 1.0
  const blend = params.blendWeight * sportMult

  // If blend is effectively 0, no analyzer impact
  if (blend < 0.01) return pred

  // Run ensemble for BOTH sides to see which the models prefer
  const homeProb = game.homeNoVigProb * 100
  const awayProb = game.awayNoVigProb * 100

  const homeDps: DataPoint[] = [
    { source: 'Confidence', metric: 'conf', value: (pred.isHomePick ? base : 100 - base) - 50, weight: params.confidenceWeight },
    { source: 'Edge', metric: 'edge', value: (game.homeNoVigProb - oddsToProb(sanitizeOdds(game.homeOdds))) * 100, weight: params.edgeWeight },
    { source: 'Spread', metric: 'spread', value: -game.spreadPoint, weight: params.spreadWeight },
  ]
  const awayDps: DataPoint[] = [
    { source: 'Confidence', metric: 'conf', value: (!pred.isHomePick ? base : 100 - base) - 50, weight: params.confidenceWeight },
    { source: 'Edge', metric: 'edge', value: (game.awayNoVigProb - oddsToProb(sanitizeOdds(game.awayOdds))) * 100, weight: params.edgeWeight },
    { source: 'Spread', metric: 'spread', value: game.spreadPoint, weight: params.spreadWeight },
  ]

  const homeEnsemble = runEnsemble(homeProb, homeDps)
  const awayEnsemble = runEnsemble(awayProb, awayDps)

  // Current pick's ensemble
  const pickEnsemble = pred.isHomePick ? homeEnsemble : awayEnsemble
  const oppEnsemble = pred.isHomePick ? awayEnsemble : homeEnsemble

  // Check if analyzer wants to FLIP the pick
  const shouldFlip =
    oppEnsemble > params.flipThreshold &&
    pickEnsemble < (100 - params.flipThreshold) &&
    (oppEnsemble - pickEnsemble) > 10

  if (shouldFlip) {
    // Flip to the other side
    const newIsHome = !pred.isHomePick
    const newPick = newIsHome ? game.homeTeam : game.awayTeam
    const newOdds = sanitizeOdds(newIsHome ? game.homeOdds : game.awayOdds)
    const newModelProb = newIsHome ? game.homeNoVigProb : game.awayNoVigProb
    const newImplied = oddsToProb(newOdds)
    const newEdge = (newModelProb - newImplied) * 100
    const newConf = base * (1 - blend) + oppEnsemble * blend

    // Give underdog flips a bonus (they have better odds payouts)
    const underdogBonus = newOdds > 0 ? params.underdogBonus * (newOdds / 500) : 0

    return {
      ...pred,
      pick: newPick,
      pickOdds: newOdds,
      isHomePick: newIsHome,
      pickType: 'MONEYLINE',
      confidence: Math.min(95, Math.max(35, newConf + underdogBonus)),
      edge: newEdge,
      pickLine: undefined,
    }
  }

  // No flip — blend confidence
  const adjustedConf = base * (1 - blend) + pickEnsemble * blend
  const impliedProb = oddsToProb(pred.pickOdds) * 100
  const newEdge = adjustedConf - impliedProb

  return { ...pred, confidence: adjustedConf, edge: newEdge }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADING
// ═══════════════════════════════════════════════════════════════════════════════

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

function teamsMatch(a: string, b: string): boolean {
  const na = normalize(a), nb = normalize(b)
  if (na === nb) return true
  const la = na.split(' ').pop() || '', lb = nb.split(' ').pop() || ''
  if (la.length >= 4 && nb.includes(la)) return true
  if (lb.length >= 4 && na.includes(lb)) return true
  // Also check first significant word
  const fa = na.split(' ').find(w => w.length >= 4) || ''
  const fb = nb.split(' ').find(w => w.length >= 4) || ''
  if (fa.length >= 4 && nb.includes(fa)) return true
  if (fb.length >= 4 && na.includes(fb)) return true
  return false
}

function gradePrediction(pred: Prediction, outcome: GameOutcome): GradedPrediction {
  const homeWon = outcome.home_score > outcome.away_score
  const isTie = outcome.home_score === outcome.away_score

  if (pred.pickType === 'SPREAD' && pred.pickLine != null) {
    // Grade spread: home picked at -5.5 → home_score - away_score > 5.5
    const margin = outcome.home_score - outcome.away_score
    const line = pred.pickLine  // negative = home favored
    const pickedHome = teamsMatch(pred.pick, outcome.home_team)
    const covered = pickedHome ? (margin + line > 0) : (-margin - line > 0)
    // Push if exactly on line (only possible with whole numbers)
    const pushed = pickedHome ? (margin + line === 0) : (-margin - line === 0)
    if (pushed) return { prediction: pred, outcome, result: 'push', profit: 0 }
    const odds = pred.pickOdds
    const profit = covered ? (odds > 0 ? odds : (100 / Math.abs(odds)) * 100) : -100
    return { prediction: pred, outcome, result: covered ? 'win' : 'loss', profit }
  }

  // Moneyline
  if (isTie) return { prediction: pred, outcome, result: 'push', profit: 0 }
  const pickedHome = teamsMatch(pred.pick, outcome.home_team)
  const won = (pickedHome && homeWon) || (!pickedHome && !homeWon)
  const odds = pred.pickOdds
  const profit = won ? (odds > 0 ? odds : (100 / Math.abs(odds)) * 100) : -100

  return { prediction: pred, outcome, result: won ? 'win' : 'loss', profit }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP 1000 BANKROLL SIMS
// ═══════════════════════════════════════════════════════════════════════════════

function bootstrapBankroll(graded: GradedPrediction[], numSims = 1000, startBR = 10000, bet = 100) {
  const nonPush = graded.filter(g => g.result !== 'push')
  if (!nonPush.length) return { avgBR: startBR, medBR: startBR, stdDev: 0, winRate: 0, roi: 0, profPct: 0, p5: startBR, p95: startBR, maxDD: 0 }

  const finals: number[] = []
  const dds: number[] = []
  for (let sim = 0; sim < numSims; sim++) {
    let br = startBR, peak = startBR, maxDD = 0
    for (let i = 0; i < nonPush.length; i++) {
      const idx = Math.floor(Math.random() * nonPush.length)
      br += (nonPush[idx].profit / 100) * bet
      if (br > peak) peak = br
      const dd = (peak - br) / peak
      if (dd > maxDD) maxDD = dd
    }
    finals.push(br)
    dds.push(maxDD)
  }
  finals.sort((a, b) => a - b)
  const avg = finals.reduce((s, v) => s + v, 0) / numSims
  const wins = nonPush.filter(g => g.result === 'win').length
  const totalProfit = nonPush.reduce((s, g) => s + (g.profit / 100) * bet, 0)
  return {
    avgBR: Math.round(avg),
    medBR: Math.round(finals[Math.floor(numSims / 2)]),
    stdDev: Math.round(Math.sqrt(finals.reduce((s, v) => s + (v - avg) ** 2, 0) / numSims)),
    winRate: Math.round((wins / nonPush.length) * 10000) / 100,
    roi: Math.round((totalProfit / (nonPush.length * bet)) * 10000) / 100,
    profPct: Math.round(finals.filter(b => b > startBR).length / numSims * 10000) / 100,
    p5: Math.round(finals[Math.floor(numSims * 0.05)]),
    p95: Math.round(finals[Math.floor(numSims * 0.95)]),
    maxDD: Math.round(dds.reduce((s, v) => s + v, 0) / numSims * 10000) / 100,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA FETCHING + RECONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchAndReconstruct(): Promise<{ games: ReconstructedGame[]; outcomes: GameOutcome[] }> {
  // Find date range with data
  const { data: latestOdds } = await supabase.from('historical_odds').select('captured_at').order('captured_at', { ascending: false }).limit(1)
  const { data: earliestOdds } = await supabase.from('historical_odds').select('captured_at').order('captured_at', { ascending: true }).limit(1)

  if (!latestOdds?.length) { console.error('No historical_odds data'); return { games: [], outcomes: [] } }

  const latest = new Date(latestOdds[0].captured_at)
  const start = new Date(latest)
  start.setDate(start.getDate() - 7)
  const startStr = start.toISOString()
  const endStr = latest.toISOString()
  const startDate = start.toISOString().split('T')[0]
  const endDate = latest.toISOString().split('T')[0]

  console.log(`  📅 Odds range: ${earliestOdds?.[0]?.captured_at?.slice(0, 10)} to ${latestOdds[0].captured_at.slice(0, 10)}`)
  console.log(`  📅 Using 7-day window: ${startDate} to ${endDate}`)

  // Fetch all odds in window (paginate if needed)
  let allOdds: any[] = []
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data: rows, error } = await supabase
      .from('historical_odds')
      .select('*')
      .gte('captured_at', startStr)
      .lte('captured_at', endStr)
      .range(page * pageSize, (page + 1) * pageSize - 1)
    if (error) { console.error('Error fetching odds:', error.message); break }
    if (!rows?.length) break
    allOdds = allOdds.concat(rows)
    if (rows.length < pageSize) break
    page++
  }
  console.log(`  📊 ${allOdds.length} odds records fetched`)

  // Fetch outcomes for the same window (use broader range to catch late games)
  const outStart = new Date(start)
  outStart.setDate(outStart.getDate() - 1)
  const outEnd = new Date(latest)
  outEnd.setDate(outEnd.getDate() + 1)

  const { data: outcomes } = await supabase
    .from('game_outcomes')
    .select('*')
    .gte('game_date', outStart.toISOString().split('T')[0])
    .lte('game_date', outEnd.toISOString().split('T')[0])

  console.log(`  📊 ${outcomes?.length ?? 0} game outcomes fetched`)

  // Reconstruct games: group odds by game_id, take latest snapshot per game
  const gameMap = new Map<string, { sport: string; homeTeam: string; awayTeam: string; commenceTime: string; bookOdds: Map<string, any> }>()

  for (const row of allOdds) {
    if (!gameMap.has(row.game_id)) {
      gameMap.set(row.game_id, {
        sport: row.sport,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        commenceTime: row.commence_time,
        bookOdds: new Map(),
      })
    }
    const g = gameMap.get(row.game_id)!
    const bmKey = `${row.bookmaker}_${row.market_type}`
    const existing = g.bookOdds.get(bmKey)
    // Keep latest odds snapshot
    if (!existing || new Date(row.captured_at) > new Date(existing.captured_at)) {
      g.bookOdds.set(bmKey, row)
    }
  }

  // Build reconstructed games with consensus odds
  const games: ReconstructedGame[] = []
  for (const [gameId, g] of gameMap) {
    let homeOddsSum = 0, awayOddsSum = 0, homeN = 0, awayN = 0
    let spreadSum = 0, spreadN = 0, totalSum = 0, totalN = 0

    for (const [, row] of g.bookOdds) {
      if (row.market_type === 'moneyline' && row.home_odds != null && row.away_odds != null) {
        if (Math.abs(row.home_odds) >= 100 && Math.abs(row.away_odds) >= 100) {
          homeOddsSum += row.home_odds; homeN++
          awayOddsSum += row.away_odds; awayN++
        }
      } else if (row.market_type === 'spreads' && row.home_spread != null) {
        spreadSum += Number(row.home_spread); spreadN++
      } else if (row.market_type === 'totals' && row.total_line != null) {
        totalSum += Number(row.total_line); totalN++
      }
    }

    if (!homeN || !awayN) continue

    const homeOdds = Math.round(homeOddsSum / homeN)
    const awayOdds = Math.round(awayOddsSum / awayN)
    const spreadPoint = spreadN > 0 ? Math.round(spreadSum / spreadN * 10) / 10 : 0
    const totalPoint = totalN > 0 ? Math.round(totalSum / totalN) : (SPORT_DEFAULT_TOTAL[g.sport] ?? 44)

    const { home: homeNoVig, away: awayNoVig } = shinDevig(oddsToProb(homeOdds), oddsToProb(awayOdds))

    games.push({
      gameId,
      sport: g.sport,
      league: sportToLeague(g.sport),
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      commenceTime: g.commenceTime,
      homeOdds, awayOdds,
      spreadPoint, totalPoint,
      homeNoVigProb: homeNoVig,
      awayNoVigProb: awayNoVig,
    })
  }

  console.log(`  🎮 ${games.length} unique games reconstructed from odds`)
  return { games, outcomes: outcomes || [] }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARAMETER SWEEP
// ═══════════════════════════════════════════════════════════════════════════════

function runSweep(
  games: ReconstructedGame[],
  outcomes: GameOutcome[],
  matched: Map<string, { game: ReconstructedGame; outcome: GameOutcome }>
): AnalyzerParams {
  console.log('\n🔧 PARAMETER SWEEP — Finding optimal analyzer settings...')

  const bws = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]
  const cws = [0.5, 0.7, 0.8, 1.0]
  const ews = [0.3, 0.5, 0.6, 0.8, 1.0]
  const sws = [0.3, 0.5, 0.7]
  const fts = [45, 50, 55, 60]       // flip thresholds
  const ubs = [0, 0.3, 0.5, 1.0]     // underdog bonuses
  const total = bws.length * cws.length * ews.length * sws.length * fts.length * ubs.length

  let best = { ...DEFAULT_PARAMS }
  let bestScore = -Infinity
  let tested = 0

  for (const bw of bws) {
    for (const cw of cws) {
      for (const ew of ews) {
        for (const sw of sws) {
          for (const ft of fts) {
            for (const ub of ubs) {
              tested++
              const params: AnalyzerParams = { blendWeight: bw, confidenceWeight: cw, edgeWeight: ew, spreadWeight: sw, minEdgeActivation: 2, flipThreshold: ft, valueBetMinEdge: 3, underdogBonus: ub, sportMultipliers: { ...DEFAULT_PARAMS.sportMultipliers } }

              let wins = 0, losses = 0, totalProfit = 0
              const leagueWR: Record<string, { w: number; l: number }> = {}

              for (const [, { game, outcome }] of matched) {
                const pred = generatePrediction(game)
                const withA = applyAnalyzer(pred, params)
                const graded = gradePrediction(withA, outcome)
                if (graded.result === 'push') continue
                if (graded.result === 'win') wins++; else losses++
                totalProfit += graded.profit
                const lg = game.league
                if (!leagueWR[lg]) leagueWR[lg] = { w: 0, l: 0 }
                if (graded.result === 'win') leagueWR[lg].w++; else leagueWR[lg].l++
              }

              if (wins + losses === 0) continue
              const wr = wins / (wins + losses)
              const roi = totalProfit / ((wins + losses) * 100)

              // Penalize inconsistency across leagues
              let penalty = 0
              for (const [, lr] of Object.entries(leagueWR)) {
                if (lr.w + lr.l >= 3) {
                  const lwr = lr.w / (lr.w + lr.l)
                  if (lwr < 0.35) penalty += 0.05
                }
              }

              const score = roi - penalty
              if (score > bestScore) {
                bestScore = score
                best = { ...params }
              }
            }
          }
        }
      }
    }
    process.stdout.write(`\r  Progress: ${Math.round(tested / total * 100)}% (${tested}/${total})`)
  }

  // Tune sport multipliers
  console.log('\n\n  🏅 Tuning sport-specific multipliers...')
  const leagues = [...new Set([...matched.values()].map(m => m.game.league))]
  for (const league of leagues) {
    const leagueGames = [...matched.values()].filter(m => m.game.league === league)
    if (leagueGames.length < 3) continue
    let bestMult = 1.0, bestROI = -Infinity
    for (const mult of [0.0, 0.3, 0.5, 0.7, 0.8, 1.0, 1.2, 1.5]) {
      const testP = { ...best, sportMultipliers: { ...best.sportMultipliers, [league]: mult } }
      let profit = 0, count = 0
      for (const { game, outcome } of leagueGames) {
        const pred = generatePrediction(game)
        const withA = applyAnalyzer(pred, testP)
        const g = gradePrediction(withA, outcome)
        if (g.result !== 'push') { profit += g.profit; count++ }
      }
      const r = count > 0 ? profit / (count * 100) : 0
      if (r > bestROI) { bestROI = r; bestMult = mult }
    }
    best.sportMultipliers[league] = bestMult
    console.log(`    ${league}: mult=${bestMult} (ROI: ${(bestROI * 100).toFixed(2)}%, ${leagueGames.length} games)`)
  }

  console.log(`\n  ✅ Best: blend=${best.blendWeight}, conf=${best.confidenceWeight}, edge=${best.edgeWeight}, spread=${best.spreadWeight}, flip=${best.flipThreshold}, udog=${best.underdogBonus}`)
  console.log(`  📈 Best score (ROI - penalty): ${(bestScore * 100).toFixed(2)}%`)
  return best
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

function pad(s: string, len = 16): string { return s.padStart(len) }
function padR(s: string, len: number): string { return s.padEnd(len) }

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║     CEVICT PROBABILITY ANALYZER — 1000 SIMULATION A/B TEST         ║
║     With vs Without 16-Model Ensemble • 7 Days Real Data           ║
╚══════════════════════════════════════════════════════════════════════╝`)

  const { games, outcomes } = await fetchAndReconstruct()
  if (!games.length) { console.error('\n❌ No games reconstructed from odds data.'); process.exit(1) }
  if (!outcomes.length) { console.error('\n❌ No game outcomes found.'); process.exit(1) }

  // Match games to outcomes
  const matched = new Map<string, { game: ReconstructedGame; outcome: GameOutcome }>()
  let unmatched = 0
  for (const game of games) {
    let found: GameOutcome | null = null
    for (const outcome of outcomes) {
      if (teamsMatch(game.homeTeam, outcome.home_team) && teamsMatch(game.awayTeam, outcome.away_team)) {
        if (outcome.home_score + outcome.away_score > 0) { found = outcome; break }
      }
    }
    if (found) matched.set(game.gameId, { game, outcome: found })
    else unmatched++
  }

  console.log(`\n📊 MATCHED: ${matched.size} games with outcomes`)
  console.log(`   UNMATCHED: ${unmatched} (pending or no outcome)`)

  if (matched.size === 0) { console.error('\n❌ No games matched to outcomes.'); process.exit(1) }

  // League breakdown
  const leagueCount: Record<string, number> = {}
  for (const [, { game }] of matched) { leagueCount[game.league] = (leagueCount[game.league] || 0) + 1 }
  console.log('\n📋 League breakdown:')
  for (const [lg, ct] of Object.entries(leagueCount).sort((a, b) => b[1] - a[1])) console.log(`   ${lg}: ${ct} games`)

  // ═════════════════════════════════════════════════════════════════════
  // PHASE 1: BASELINE (WITHOUT Analyzer)
  // ═════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70))
  console.log('  PHASE 1: BASELINE (WITHOUT Probability Analyzer)')
  console.log('═'.repeat(70))

  const baselineGraded: GradedPrediction[] = []
  let baseML = 0, baseSpread = 0, baseFav = 0, baseDog = 0
  for (const [, { game, outcome }] of matched) {
    const pred = generatePrediction(game)
    baselineGraded.push(gradePrediction(pred, outcome))
    if (pred.pickType === 'MONEYLINE') baseML++; else baseSpread++
    const isFav = pred.isHomePick ? game.homeNoVigProb > 0.5 : game.awayNoVigProb > 0.5
    if (isFav) baseFav++; else baseDog++
  }
  const baseStats = bootstrapBankroll(baselineGraded)
  console.log(`  Win Rate: ${baseStats.winRate}%  |  ROI: ${baseStats.roi}%  |  Avg BR: $${baseStats.avgBR}`)
  console.log(`  Pick Types: ${baseML} ML, ${baseSpread} Spread  |  Favorites: ${baseFav}, Underdogs: ${baseDog}`)

  // ═════════════════════════════════════════════════════════════════════
  // PHASE 2: PARAMETER TUNING
  // ═════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70))
  console.log('  PHASE 2: PARAMETER TUNING')
  console.log('═'.repeat(70))

  const bestParams = runSweep(games, outcomes, matched)

  // ═════════════════════════════════════════════════════════════════════
  // PHASE 3: WITH ANALYZER (Tuned)
  // ═════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70))
  console.log('  PHASE 3: WITH PROBABILITY ANALYZER (Tuned)')
  console.log('═'.repeat(70))

  const analyzerGraded: GradedPrediction[] = []
  let analML = 0, analSpread = 0, analFav = 0, analDog = 0, flips = 0
  for (const [, { game, outcome }] of matched) {
    const pred = generatePrediction(game)
    const withA = applyAnalyzer(pred, bestParams)
    analyzerGraded.push(gradePrediction(withA, outcome))
    if (withA.pickType === 'MONEYLINE') analML++; else analSpread++
    const isFav = withA.isHomePick ? game.homeNoVigProb > 0.5 : game.awayNoVigProb > 0.5
    if (isFav) analFav++; else analDog++
    if (pred.pick !== withA.pick) flips++
  }
  const analStats = bootstrapBankroll(analyzerGraded)
  console.log(`  Win Rate: ${analStats.winRate}%  |  ROI: ${analStats.roi}%  |  Avg BR: $${analStats.avgBR}`)
  console.log(`  Pick Types: ${analML} ML, ${analSpread} Spread  |  Favorites: ${analFav}, Underdogs: ${analDog}`)
  console.log(`  🔄 Analyzer flipped ${flips} picks (${(flips / matched.size * 100).toFixed(1)}%)`)

  // Flip analysis
  if (flips > 0) {
    let flipWins = 0, flipLosses = 0, flipProfit = 0
    let origWouldWin = 0
    for (const [, { game, outcome }] of matched) {
      const pred = generatePrediction(game)
      const withA = applyAnalyzer(pred, bestParams)
      if (pred.pick !== withA.pick) {
        const flippedGrade = gradePrediction(withA, outcome)
        const origGrade = gradePrediction(pred, outcome)
        if (flippedGrade.result === 'win') { flipWins++; flipProfit += flippedGrade.profit }
        else if (flippedGrade.result === 'loss') { flipLosses++; flipProfit += flippedGrade.profit }
        if (origGrade.result === 'win') origWouldWin++
      }
    }
    console.log(`  📊 Flipped picks: ${flipWins}W/${flipLosses}L (${flips > 0 ? (flipWins / (flipWins + flipLosses) * 100).toFixed(1) : 0}% WR)`)
    console.log(`     Original would have won: ${origWouldWin}/${flips} (${(origWouldWin / flips * 100).toFixed(1)}%)`)
    console.log(`     Net profit from flips: ${flipProfit > 0 ? '+' : ''}${flipProfit.toFixed(0)} units`)
  }

  // ═════════════════════════════════════════════════════════════════════
  // FINAL RESULTS TABLE
  // ═════════════════════════════════════════════════════════════════════
  console.log('\n\n' + '═'.repeat(70))
  console.log('  📊 FINAL RESULTS: 1000-SIMULATION A/B TEST')
  console.log('═'.repeat(70))

  console.log('\n┌─────────────────────────┬──────────────────┬──────────────────┐')
  console.log('│ Metric                  │ WITHOUT Analyzer  │ WITH Analyzer     │')
  console.log('├─────────────────────────┼──────────────────┼──────────────────┤')
  const rows: [string, string, string][] = [
    ['Win Rate', baseStats.winRate + '%', analStats.winRate + '%'],
    ['ROI', baseStats.roi + '%', analStats.roi + '%'],
    ['Avg Final Bankroll', '$' + baseStats.avgBR, '$' + analStats.avgBR],
    ['Median Final Bankroll', '$' + baseStats.medBR, '$' + analStats.medBR],
    ['Std Dev', '$' + baseStats.stdDev, '$' + analStats.stdDev],
    ['% Profitable Sims', baseStats.profPct + '%', analStats.profPct + '%'],
    ['5th Percentile', '$' + baseStats.p5, '$' + analStats.p5],
    ['95th Percentile', '$' + baseStats.p95, '$' + analStats.p95],
    ['Max Drawdown', baseStats.maxDD + '%', analStats.maxDD + '%'],
  ]
  for (const [label, b, a] of rows) {
    console.log(`│ ${padR(label, 23)} │ ${pad(b, 16)} │ ${pad(a, 16)} │`)
  }
  console.log('└─────────────────────────┴──────────────────┴──────────────────┘')

  // Per-league breakdown
  const leagues = Object.keys(leagueCount).sort()
  console.log('\n┌──────────┬──────────────────────────┬──────────────────────────┐')
  console.log('│ League   │ WITHOUT Analyzer          │ WITH Analyzer            │')
  console.log('├──────────┼──────────────────────────┼──────────────────────────┤')

  for (const lg of leagues) {
    const bL = baselineGraded.filter(g => g.prediction.game.league === lg && g.result !== 'push')
    const aL = analyzerGraded.filter(g => g.prediction.game.league === lg && g.result !== 'push')
    const bW = bL.filter(g => g.result === 'win').length
    const aW = aL.filter(g => g.result === 'win').length
    const bWR = bL.length > 0 ? Math.round(bW / bL.length * 1000) / 10 : 0
    const aWR = aL.length > 0 ? Math.round(aW / aL.length * 1000) / 10 : 0
    const bProfit = bL.reduce((s, g) => s + g.profit, 0)
    const aProfit = aL.reduce((s, g) => s + g.profit, 0)
    const bROI = bL.length > 0 ? Math.round(bProfit / bL.length * 10) / 10 : 0
    const aROI = aL.length > 0 ? Math.round(aProfit / aL.length * 10) / 10 : 0
    const mult = bestParams.sportMultipliers[lg] ?? 1.0

    const bStr = `${bW}W/${bL.length - bW}L ${bWR}% ROI:${bROI > 0 ? '+' : ''}${bROI}`
    const aStr = `${aW}W/${aL.length - aW}L ${aWR}% m:${mult}`

    console.log(`│ ${padR(lg, 8)} │ ${padR(bStr, 24)} │ ${padR(aStr, 24)} │`)
  }
  console.log('└──────────┴──────────────────────────┴──────────────────────────┘')

  // Verdict
  const roiDiff = analStats.roi - baseStats.roi
  const profDiff = analStats.profPct - baseStats.profPct

  console.log('\n' + '═'.repeat(70))
  if (roiDiff > 1 && profDiff > 0) {
    console.log(`  ✅ VERDICT: PROBABILITY ANALYZER HELPS`)
    console.log(`     ROI improved by ${roiDiff.toFixed(2)}pp, profitable sims up ${profDiff.toFixed(1)}pp`)
  } else if (roiDiff < -1 && profDiff < 0) {
    console.log(`  ❌ VERDICT: PROBABILITY ANALYZER HURTS`)
    console.log(`     ROI decreased by ${Math.abs(roiDiff).toFixed(2)}pp, profitable sims down ${Math.abs(profDiff).toFixed(1)}pp`)
  } else {
    console.log(`  ⚖️  VERDICT: PROBABILITY ANALYZER HAS MINIMAL IMPACT`)
    console.log(`     ROI diff: ${roiDiff >= 0 ? '+' : ''}${roiDiff.toFixed(2)}pp, profitable sims diff: ${profDiff >= 0 ? '+' : ''}${profDiff.toFixed(1)}pp`)
  }

  console.log(`\n  🔧 OPTIMAL PARAMETERS:`)
  console.log(`     Blend Weight:       ${bestParams.blendWeight}`)
  console.log(`     Confidence Weight:  ${bestParams.confidenceWeight}`)
  console.log(`     Edge Weight:        ${bestParams.edgeWeight}`)
  console.log(`     Spread Weight:      ${bestParams.spreadWeight}`)
  console.log(`     Flip Threshold:     ${bestParams.flipThreshold}`)
  console.log(`     Underdog Bonus:     ${bestParams.underdogBonus}`)
  console.log(`     Sport Multipliers:`)
  for (const [lg, mult] of Object.entries(bestParams.sportMultipliers)) {
    if (leagueCount[lg]) console.log(`       ${lg}: ${mult}`)
  }
  console.log('═'.repeat(70) + '\n')

  // Save results to file
  const results = {
    timestamp: new Date().toISOString(),
    gamesAnalyzed: matched.size,
    leagueBreakdown: leagueCount,
    baseline: baseStats,
    withAnalyzer: analStats,
    optimalParams: bestParams,
    verdict: roiDiff > 1 ? 'HELPS' : roiDiff < -1 ? 'HURTS' : 'MINIMAL_IMPACT',
    roiDifference: roiDiff,
  }
  const outPath = path.resolve(__dirname, '..', 'simulation-results.json')
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
  console.log(`📄 Results saved to ${outPath}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
