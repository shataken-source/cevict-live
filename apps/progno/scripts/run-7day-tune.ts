/**
 * 7-DAY TUNING — Run simulation with multiple parameter sets, pick best outcome.
 * Spawns run-7day-simulation.ts with env overrides; parses TUNE_RESULT; reports best WR/ROI.
 *
 * Usage: npm run simulate:7day:tune
 *        npx tsx scripts/run-7day-tune.ts
 */

import { spawn } from 'child_process'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROGNO_ROOT = path.resolve(__dirname, '..')
const SIM_SCRIPT = path.join(PROGNO_ROOT, 'scripts', 'run-7day-simulation.ts')

interface TuneResult {
  winRate: number
  roi: number
  graded: number
  picks: number
  wins: number
  losses: number
  pushes?: number
}

interface Trial {
  name: string
  env: Record<string, string>
}

function runOne(trial: Trial): Promise<TuneResult | null> {
  return new Promise((resolve) => {
    const env = { ...process.env, ...trial.env }
    const child = spawn('npx', ['tsx', 'scripts/run-7day-simulation.ts', '--tune'], {
      cwd: PROGNO_ROOT,
      env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    child.stdout?.on('data', (d) => { out += d.toString() })
    child.stderr?.on('data', () => {}) // suppress filter logs during tune
    child.on('close', (code) => {
      const match = out.match(/TUNE_RESULT=(.+)/)
      if (match) {
        try {
          resolve(JSON.parse(match[1]) as TuneResult)
        } catch {
          resolve(null)
        }
      } else {
        resolve(null)
      }
    })
    child.on('error', () => resolve(null))
  })
}

// Home-only is now OFF by default (7-day tune: 8.5% ROI with away vs -2.98% home-only).
const TRIALS: Trial[] = [
  { name: 'Baseline (away allowed, current floors)', env: {} },
  { name: 'Floors +2 (stricter)', env: {
    PROGNO_FLOOR_NBA: '62', PROGNO_FLOOR_NHL: '61', PROGNO_FLOOR_NCAAB: '66',
    PROGNO_FLOOR_NFL: '64', PROGNO_FLOOR_MLB: '61', PROGNO_FLOOR_NCAAF: '66',
    PROGNO_FLOOR_CBB: '70',
  }},
  { name: 'Floors -2 (looser)', env: {
    PROGNO_FLOOR_NBA: '58', PROGNO_FLOOR_NHL: '57', PROGNO_FLOOR_NCAAB: '62',
    PROGNO_FLOOR_NFL: '60', PROGNO_FLOOR_MLB: '57', PROGNO_FLOOR_NCAAF: '62',
    PROGNO_FLOOR_CBB: '66',
  }},
  { name: 'College stricter (NCAAB=68 CBB=72)', env: {
    PROGNO_FLOOR_NCAAB: '68', PROGNO_FLOOR_CBB: '72',
  }},
  { name: 'NBA/NHL only stricter', env: {
    PROGNO_FLOOR_NBA: '64', PROGNO_FLOOR_NHL: '63',
  }},
  { name: 'All floors 65', env: {
    PROGNO_FLOOR_NBA: '65', PROGNO_FLOOR_NHL: '65', PROGNO_FLOOR_NCAAB: '65',
    PROGNO_FLOOR_NFL: '65', PROGNO_FLOOR_MLB: '65', PROGNO_FLOOR_NCAAF: '65',
    PROGNO_FLOOR_CBB: '70',
  }},
  { name: 'Floors +1', env: {
    PROGNO_FLOOR_NBA: '61', PROGNO_FLOOR_NHL: '60', PROGNO_FLOOR_NCAAB: '65',
    PROGNO_FLOOR_NFL: '63', PROGNO_FLOOR_MLB: '60', PROGNO_FLOOR_NCAAF: '65',
    PROGNO_FLOOR_CBB: '69',
  }},
]

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗')
  console.log('║  7-DAY TUNING — Running simulation with multiple parameter sets  ║')
  console.log('╚══════════════════════════════════════════════════════════════════╝\n')

  const results: { name: string; result: TuneResult }[] = []
  for (let i = 0; i < TRIALS.length; i++) {
    const trial = TRIALS[i]
    process.stdout.write(`  [${i + 1}/${TRIALS.length}] ${trial.name}... `)
    const result = await runOne(trial)
    if (result) {
      results.push({ name: trial.name, result })
      console.log(`WR=${result.winRate}% ROI=${result.roi}% (${result.graded} graded)`)
    } else {
      console.log('(no result)')
    }
  }

  if (results.length === 0) {
    console.log('\n❌ No valid results. Check simulation script and Supabase data.')
    process.exit(1)
  }

  // Best by ROI first, then win rate
  const byRoi = [...results].sort((a, b) => b.result.roi - a.result.roi)
  const byWr = [...results].sort((a, b) => b.result.winRate - a.result.winRate)
  const bestRoi = byRoi[0]
  const bestWr = byWr[0]

  console.log('\n═══ BEST BY ROI ═══')
  console.log(`  ${bestRoi.name}`)
  console.log(`  Win rate: ${bestRoi.result.winRate}%  ROI: ${bestRoi.result.roi}%  Graded: ${bestRoi.result.graded}`)
  console.log('\n═══ BEST BY WIN RATE ═══')
  console.log(`  ${bestWr.name}`)
  console.log(`  Win rate: ${bestWr.result.winRate}%  ROI: ${bestWr.result.roi}%  Graded: ${bestWr.result.graded}`)

  // Full table
  console.log('\n═══ ALL TRIALS (sorted by ROI) ═══')
  byRoi.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.name}: WR=${r.result.winRate}% ROI=${r.result.roi}% graded=${r.result.graded}`)
  })
  console.log('')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
