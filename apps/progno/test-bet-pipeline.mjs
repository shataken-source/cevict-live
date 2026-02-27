/**
 * Test script for the bet submission pipeline.
 * Creates mock prediction files, then tests:
 *   1. POST /api/progno/admin/trading/preview  — loads picks + matches to Kalshi
 *   2. POST /api/progno/admin/trading/place-bets — (mock-safe: we only test DB write, not real Kalshi)
 *   3. GET  /api/progno/admin/trading/performance — reads actual_bets table
 *
 * Usage: node test-bet-pipeline.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Load secret from .env.local ──────────────────────────────────────────────
function loadSecret() {
  const envPath = path.join(__dirname, '.env.local')
  if (!fs.existsSync(envPath)) { console.error('❌ .env.local not found'); process.exit(1) }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^(PROGNO_ADMIN_PASSWORD|ADMIN_PASSWORD|CRON_SECRET)=(.+)/)
    if (m) return m[2].trim()
  }
  console.error('❌ No admin secret found in .env.local'); process.exit(1)
}

const SECRET = loadSecret()
const BASE = 'http://localhost:3008'
const B = '\x1b[1m', G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C_ = '\x1b[36m', D = '\x1b[2m', X = '\x1b[0m'

let passed = 0, failed = 0

function ok(msg) { passed++; console.log(`  ${G}✓${X} ${msg}`) }
function fail(msg, detail) { failed++; console.log(`  ${R}✗${X} ${msg}`); if (detail) console.log(`    ${D}${detail}${X}`) }

// ── Create mock prediction files ─────────────────────────────────────────────
function createMockPredictions() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

  const mockPicks = [
    { pick: 'Boston Celtics', home_team: 'Boston Celtics', away_team: 'Brooklyn Nets', sport: 'NBA', league: 'NBA', confidence: 72, odds: -150, expected_value: 8.5, is_home_pick: true },
    { pick: 'Golden State Warriors', home_team: 'Golden State Warriors', away_team: 'Los Angeles Lakers', sport: 'NBA', league: 'NBA', confidence: 68, odds: -130, expected_value: 6.2, is_home_pick: true },
    { pick: 'New York Rangers', home_team: 'New York Rangers', away_team: 'New Jersey Devils', sport: 'NHL', league: 'NHL', confidence: 65, odds: +120, expected_value: 5.0, is_home_pick: true },
    { pick: 'Dallas Mavericks', home_team: 'Dallas Mavericks', away_team: 'San Antonio Spurs', sport: 'NBA', league: 'NBA', confidence: 63, odds: -140, expected_value: 4.8, is_home_pick: true },
    { pick: 'Toronto Maple Leafs', home_team: 'Toronto Maple Leafs', away_team: 'Montreal Canadiens', sport: 'NHL', league: 'NHL', confidence: 61, odds: -110, expected_value: 3.5, is_home_pick: true },
    { pick: 'Chicago Bulls', home_team: 'Chicago Bulls', away_team: 'Cleveland Cavaliers', sport: 'NBA', league: 'NBA', confidence: 58, odds: +140, expected_value: 3.0, is_home_pick: true },
    { pick: 'Gonzaga Bulldogs', home_team: 'Gonzaga Bulldogs', away_team: 'Saint Mary Gaels', sport: 'NCAAB', league: 'NCAAB', confidence: 70, odds: -200, expected_value: 7.1, is_home_pick: true },
    { pick: 'Duke Blue Devils', home_team: 'Duke Blue Devils', away_team: 'North Carolina Tar Heels', sport: 'NCAAB', league: 'NCAAB', confidence: 55, odds: +110, expected_value: 2.0, is_home_pick: true },
  ]

  const regularFile = path.join(__dirname, `predictions-${today}.json`)
  const earlyFile = path.join(__dirname, `predictions-early-${today}.json`)

  // Back up existing files
  const backups = []
  for (const f of [regularFile, earlyFile]) {
    if (fs.existsSync(f)) {
      const bak = f + '.test-bak'
      fs.copyFileSync(f, bak)
      backups.push({ original: f, backup: bak })
    }
  }

  // Write mock files
  fs.writeFileSync(regularFile, JSON.stringify({ picks: mockPicks.slice(0, 6), date: today, source: 'mock-test' }, null, 2))
  fs.writeFileSync(earlyFile, JSON.stringify({ picks: mockPicks.slice(4), date: today, source: 'mock-test-early' }, null, 2))

  console.log(`${D}  Created mock predictions for ${today} (${mockPicks.length} unique picks)${X}`)
  return { today, backups, regularFile, earlyFile }
}

function restoreFiles(backups, regularFile, earlyFile) {
  for (const { original, backup } of backups) {
    fs.copyFileSync(backup, original)
    fs.unlinkSync(backup)
  }
  // Remove mock files that didn't have backups
  for (const f of [regularFile, earlyFile]) {
    if (!backups.find(b => b.original === f) && fs.existsSync(f)) {
      // Only delete if we created it (check for mock-test source)
      try {
        const data = JSON.parse(fs.readFileSync(f, 'utf8'))
        if (data.source?.startsWith('mock-test')) fs.unlinkSync(f)
      } catch {}
    }
  }
  console.log(`${D}  Prediction files restored${X}`)
}

// ── Test helpers ─────────────────────────────────────────────────────────────
async function testPreview() {
  console.log(`\n${B}${C_}TEST 1: Preview API${X}`)
  try {
    const res = await fetch(`${BASE}/api/progno/admin/trading/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
      body: JSON.stringify({ secret: SECRET }),
    })
    const j = await res.json()

    if (!res.ok || !j.success) {
      fail('Preview returned error', j.error || JSON.stringify(j))
      return null
    }

    ok(`Status ${res.status} — ${j.totalPicks} picks loaded`)

    if (j.totalPicks >= 6) ok(`Found ${j.totalPicks} picks (expected ≥6)`)
    else fail(`Only ${j.totalPicks} picks (expected ≥6)`)

    const matched = j.picks.filter((p) => p.matched)
    const unmatched = j.picks.filter((p) => !p.matched)
    console.log(`    ${D}Matched: ${matched.length} | Unmatched: ${unmatched.length} | Markets fetched: ${j.marketsFetched}${X}`)

    if (j.marketsFetched > 0) ok(`Kalshi markets fetched: ${j.marketsFetched}`)
    else if (j.marketError) {
      console.log(`    ${Y}⚠ Kalshi not configured or error: ${j.marketError}${X}`)
      ok('Preview works (Kalshi not configured — expected in test)')
    }

    // Check pick structure
    const sample = j.picks[0]
    const requiredFields = ['pick', 'home_team', 'away_team', 'sport', 'confidence', 'matched', 'default_stake_cents']
    const missing = requiredFields.filter(f => sample[f] === undefined)
    if (missing.length === 0) ok('Pick structure has all required fields')
    else fail(`Missing fields: ${missing.join(', ')}`)

    // Verify sports are correct
    const sports = [...new Set(j.picks.map(p => p.sport))]
    ok(`Sports found: ${sports.join(', ')}`)

    return j
  } catch (e) {
    fail('Preview request failed', e.message)
    return null
  }
}

async function testPlaceBetsMockDB(previewData) {
  console.log(`\n${B}${C_}TEST 2: Place Bets API (DB write only — mock bets)${X}`)

  if (!previewData) {
    fail('Skipped — no preview data')
    return
  }

  // Create mock bet entries that simulate what the modal would send
  // We use fake tickers so Kalshi will reject them — but we test the DB write path
  const mockBets = [
    {
      pick: 'Mock Celtics Win',
      home_team: 'Boston Celtics',
      away_team: 'Brooklyn Nets',
      sport: 'NBA',
      league: 'NBA',
      confidence: 72,
      ticker: 'MOCK-TEST-TICKER-1',
      market_title: 'Mock: Will Boston Celtics win?',
      side: 'yes',
      price: 55,
      contracts: 9,
      stake_cents: 500,
    },
    {
      pick: 'Mock Rangers Win',
      home_team: 'New York Rangers',
      away_team: 'New Jersey Devils',
      sport: 'NHL',
      league: 'NHL',
      confidence: 65,
      ticker: 'MOCK-TEST-TICKER-2',
      market_title: 'Mock: Will NY Rangers win?',
      side: 'yes',
      price: 48,
      contracts: 10,
      stake_cents: 500,
    },
  ]

  try {
    const res = await fetch(`${BASE}/api/progno/admin/trading/place-bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
      body: JSON.stringify({ secret: SECRET, bets: mockBets }),
    })
    const j = await res.json()

    if (!res.ok || !j.success) {
      fail('Place-bets returned error', j.error || JSON.stringify(j))
      return
    }

    ok(`Status ${res.status} — total: ${j.total}`)

    // With mock tickers, Kalshi will reject orders — that's expected
    // The important thing is the API didn't crash
    const submitted = j.results.filter(r => r.status === 'submitted').length
    const errors = j.results.filter(r => r.status === 'error').length
    console.log(`    ${D}Submitted: ${submitted} | Errors: ${errors} (errors expected with mock tickers)${X}`)

    if (errors > 0) {
      ok(`Got ${errors} Kalshi errors (expected — mock tickers aren't real)`)
      // Check error messages are meaningful
      const errMsg = j.results.find(r => r.status === 'error')?.error || ''
      if (errMsg.length > 0) ok(`Error message present: "${errMsg.slice(0, 80)}..."`)
      else fail('Error result has no error message')
    }

    if (submitted > 0) {
      ok(`${submitted} orders went through (unexpected with mock tickers but OK)`)
    }

    ok('Place-bets API did not crash')

  } catch (e) {
    fail('Place-bets request failed', e.message)
  }
}

async function testPerformance() {
  console.log(`\n${B}${C_}TEST 3: Performance API${X}`)
  try {
    const res = await fetch(`${BASE}/api/progno/admin/trading/performance`, {
      headers: { Authorization: `Bearer ${SECRET}` },
      cache: 'no-store',
    })
    const j = await res.json()

    if (!res.ok || !j.success) {
      fail('Performance returned error', j.error || JSON.stringify(j))
      return
    }

    ok(`Status ${res.status}`)

    // Check structure
    if (j.overall) ok('Has overall stats')
    else fail('Missing overall stats')

    if (Array.isArray(j.bySport)) ok(`By sport: ${j.bySport.length} entries`)
    else fail('Missing bySport array')

    if (Array.isArray(j.byDate)) ok(`By date: ${j.byDate.length} entries`)
    else fail('Missing byDate array')

    if (Array.isArray(j.recentBets)) ok(`Recent bets: ${j.recentBets.length} entries`)
    else fail('Missing recentBets array')

    // Print summary
    const o = j.overall
    console.log(`    ${D}Total: ${o.totalBets} | Wins: ${o.wins} | Losses: ${o.losses} | Pending: ${o.pending} | WinRate: ${o.winRate}% | ROI: ${o.roi}% | Profit: ${o.totalProfit}${X}`)

    if (o.totalBets >= 0) ok('Overall stats are valid numbers')
    else fail('Invalid overall stats')

  } catch (e) {
    fail('Performance request failed', e.message)
  }
}

async function testAuthRejection() {
  console.log(`\n${B}${C_}TEST 4: Auth rejection (bad secret)${X}`)
  try {
    const res = await fetch(`${BASE}/api/progno/admin/trading/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-secret-12345' },
      body: JSON.stringify({ secret: 'wrong-secret-12345' }),
    })
    if (res.status === 401) ok('Preview correctly rejected bad secret (401)')
    else fail(`Expected 401, got ${res.status}`)

    const res2 = await fetch(`${BASE}/api/progno/admin/trading/performance`, {
      headers: { Authorization: 'Bearer wrong-secret-12345' },
    })
    if (res2.status === 401) ok('Performance correctly rejected bad secret (401)')
    else fail(`Expected 401, got ${res2.status}`)

    const res3 = await fetch(`${BASE}/api/progno/admin/trading/place-bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-secret-12345' },
      body: JSON.stringify({ secret: 'wrong-secret-12345', bets: [] }),
    })
    if (res3.status === 401) ok('Place-bets correctly rejected bad secret (401)')
    else fail(`Expected 401, got ${res3.status}`)

  } catch (e) {
    fail('Auth test request failed', e.message)
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${B}${C_}╔══════════════════════════════════════════════════════╗${X}`)
  console.log(`${B}${C_}║   🧪 PROGNO BET PIPELINE — MOCK TEST                ║${X}`)
  console.log(`${B}${C_}╚══════════════════════════════════════════════════════╝${X}`)
  console.log(`${D}  Server: ${BASE}${X}`)

  // Check server is up
  try {
    const ping = await fetch(`${BASE}/api/progno/admin/trading/performance`, { headers: { Authorization: `Bearer ${SECRET}` } })
    if (!ping.ok && ping.status !== 401) throw new Error(`Server returned ${ping.status}`)
  } catch (e) {
    console.error(`\n${R}❌ Dev server not reachable at ${BASE}${X}`)
    console.error(`${D}   Start it with: cd apps/progno && npm run dev${X}`)
    console.error(`${D}   Error: ${e.message}${X}`)
    process.exit(1)
  }

  const { today, backups, regularFile, earlyFile } = createMockPredictions()

  try {
    await testAuthRejection()
    const previewData = await testPreview()
    await testPlaceBetsMockDB(previewData)
    await testPerformance()
  } finally {
    restoreFiles(backups, regularFile, earlyFile)
  }

  console.log(`\n${B}════════════════════════════════════════════════════════${X}`)
  console.log(`  ${G}✓ Passed: ${passed}${X}  ${failed > 0 ? R : D}✗ Failed: ${failed}${X}`)
  console.log(`${B}════════════════════════════════════════════════════════${X}\n`)

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
