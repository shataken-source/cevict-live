// calibration_sanity_check.ts
// Tiny TypeScript sanity check: loads calibration CSV and platt_params.json,
// computes Brier and LogLoss before/after Platt calibration and prints bucket table.
//
// Run with: npx tsx calibration_sanity_check.ts
// (or ts-node / compile with tsc)

import fs from 'fs';
import path from 'path';

const EPS = 1e-12;

type Row = { model_p: number; outcome: number; timestamp?: string };
type PlattParams = { A: number; B: number; n_samples?: number };

function safeClip(p: number) {
  return Math.min(Math.max(p, EPS), 1 - EPS);
}

function brierScore(ps: number[], ys: number[]) {
  const n = ps.length;
  if (n === 0) return NaN;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const d = ps[i] - ys[i];
    s += d * d;
  }
  return s / n;
}

function logLoss(ps: number[], ys: number[]) {
  const n = ps.length;
  if (n === 0) return NaN;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const p = safeClip(ps[i]);
    const y = ys[i];
    s += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
  }
  return s / n;
}

function safeLogit(p: number) {
  const q = safeClip(p);
  return Math.log(q / (1 - q));
}

function plattCalibrate(A: number, B: number, p: number) {
  const L = safeLogit(p);
  const z = A * L + B;
  return 1 / (1 + Math.exp(z));
}

function parseCsv(file: string): Row[] {
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];
  const header = lines[0].split(',').map(h => h.trim());
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const obj: any = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = cols[j] ?? '';
    }
    const model_p = Number(obj['model_p']);
    const outcome = Number(obj['outcome']);
    const timestamp = obj['timestamp'];
    if (!Number.isFinite(model_p) || !(outcome === 0 || outcome === 1)) continue;
    rows.push({ model_p, outcome, timestamp });
  }
  return rows;
}

function bucketCalibration(ps: number[], ys: number[], buckets = 10) {
  const counts = new Array(buckets).fill(0);
  const predSum = new Array(buckets).fill(0);
  const obsSum = new Array(buckets).fill(0);
  for (let i = 0; i < ps.length; i++) {
    const p = safeClip(ps[i]);
    const y = ys[i];
    const idx = Math.min(buckets - 1, Math.floor(p * buckets));
    counts[idx]++;
    predSum[idx] += p;
    obsSum[idx] += y;
  }
  const rows = [];
  for (let i = 0; i < buckets; i++) {
    const cnt = counts[i];
    rows.push({
      bucket: `${(i * 100 / buckets).toFixed(0)}-${(((i + 1) * 100 / buckets) - 1).toFixed(0)}%`,
      count: cnt,
      predicted: cnt ? predSum[i] / cnt : NaN,
      observed: cnt ? obsSum[i] / cnt : NaN
    });
  }
  return rows;
}

async function main() {
  const csvPath = path.join(process.cwd(), 'calibration_example.csv');
  const plattPath = path.join(process.cwd(), 'platt_params.json');

  if (!fs.existsSync(csvPath)) {
    console.error('Missing calibration_example.csv in project root. Use the example CSV provided earlier.');
    process.exit(1);
  }

  const rows = parseCsv(csvPath);
  if (rows.length === 0) {
    console.error('No valid rows parsed from CSV.');
    process.exit(1);
  }

  const modelPs = rows.map(r => r.model_p);
  const ys = rows.map(r => r.outcome);

  console.log(`Samples: ${rows.length}  Positive rate: ${(ys.reduce((a,b)=>a+b,0)/ys.length*100).toFixed(2)}%`);

  const brierBefore = brierScore(modelPs, ys);
  const llBefore = logLoss(modelPs, ys);
  console.log(`Before calibration  Brier: ${brierBefore.toFixed(6)}  LogLoss: ${llBefore.toFixed(6)}`);

  let calibratedPs = modelPs.slice();
  if (fs.existsSync(plattPath)) {
    try {
      const raw = fs.readFileSync(plattPath, 'utf8');
      const params = JSON.parse(raw) as PlattParams;
      console.log(`Loaded Platt params A=${params.A} B=${params.B} n=${params.n_samples ?? 'unknown'}`);
      calibratedPs = modelPs.map(p => plattCalibrate(params.A, params.B, p));
    } catch (e) {
      console.warn('Failed to load or parse platt_params.json, skipping Platt calibration.');
    }
  } else {
    console.log('platt_params.json not found — skipping Platt calibration (you can still run isotonic mapping).');
  }

  const brierAfter = brierScore(calibratedPs, ys);
  const llAfter = logLoss(calibratedPs, ys);
  console.log(`After calibration   Brier: ${brierAfter.toFixed(6)}  LogLoss: ${llAfter.toFixed(6)}`);

  console.log('\nCalibration buckets (predicted vs observed):');
  const bucketsBefore = bucketCalibration(modelPs, ys, 10);
  const bucketsAfter = bucketCalibration(calibratedPs, ys, 10);

  console.log('Bucket | Count | Predicted(before) | Observed | Predicted(after)');
  for (let i = 0; i < bucketsBefore.length; i++) {
    const b = bucketsBefore[i];
    const a = bucketsAfter[i];
    console.log(
      `${b.bucket.padEnd(7)} | ${String(b.count).padStart(5)} | ${isNaN(b.predicted) ? '  -   ' : (b.predicted.toFixed(3)).padStart(7)} | ${isNaN(b.observed) ? '  -   ' : (b.observed.toFixed(3)).padStart(7)} | ${isNaN(a.predicted) ? '  -   ' : (a.predicted.toFixed(3)).padStart(7)}`
    );
  }

  console.log('\nSample rows (modelP -> calibratedP -> outcome):');
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    console.log(`${modelPs[i].toFixed(3)} -> ${calibratedPs[i].toFixed(3)} -> ${ys[i]}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
