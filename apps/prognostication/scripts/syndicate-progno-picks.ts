/**
 * syndicate-progno-picks.ts
 * Reads today's progno predictions JSON and upserts them into the
 * syndicated_picks Supabase table so prognostication /api/picks/today
 * and /api/kalshi/sports serve real data instead of mock picks.
 *
 * Usage:
 *   npx tsx scripts/syndicate-progno-picks.ts [path/to/predictions.json]
 *
 * If no file is given, auto-discovers today's file from apps/progno/.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env from prognostication .env.local (no dotenv dependency)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Find predictions file ────────────────────────────────────────────────────

function findPredictionsFile(): string | null {
  const explicitArg = process.argv[2];
  if (explicitArg) {
    const resolved = path.isAbsolute(explicitArg) ? explicitArg : path.join(process.cwd(), explicitArg);
    if (fs.existsSync(resolved)) return resolved;
    console.error(`❌ File not found: ${resolved}`);
    process.exit(1);
  }

  // Auto-discover: look for today's predictions file in apps/progno
  const prognoDir = path.join(__dirname, '..', '..', 'progno');
  const today = new Date().toISOString().split('T')[0]; // e.g. 2026-02-19

  const candidates = [
    path.join(prognoDir, `predictions-${today}.json`),
    path.join(prognoDir, `predictions-early-${today}.json`),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      console.log(`📂 Auto-discovered: ${c}`);
      return c;
    }
  }

  // Fall back to most recent predictions file
  if (fs.existsSync(prognoDir)) {
    const files = fs.readdirSync(prognoDir)
      .filter(f => f.startsWith('predictions-') && f.endsWith('.json') && !f.includes('early'))
      .sort()
      .reverse();
    if (files.length > 0) {
      const latest = path.join(prognoDir, files[0]);
      console.log(`📂 Using most recent: ${latest}`);
      return latest;
    }
  }

  return null;
}

// ─── Load and parse picks ─────────────────────────────────────────────────────

interface PrognoPick {
  id?: string;
  game_id?: string;
  sport?: string;
  league?: string;
  home_team?: string;
  away_team?: string;
  pick?: string;
  pick_type?: string;
  confidence?: number;
  odds?: number;
  expected_value?: number;
  value_bet_edge?: number;
  mc_win_probability?: number;
  analysis?: string;
  game_time?: string;
  recommended_line?: number;
}

function loadPicks(filePath: string): PrognoPick[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Handle both formats: { picks: [] } and { earlyLines: [], picks: [] }
  const picks: PrognoPick[] = data.picks || data.earlyLines || [];

  if (!Array.isArray(picks) || picks.length === 0) {
    console.warn(`⚠️ No picks found in ${filePath}`);
    return [];
  }

  return picks;
}

// ─── Upsert to syndicated_picks ───────────────────────────────────────────────

async function syndicatePicks(picks: PrognoPick[], sourceFile: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const batchId = `progno-${today}-${Date.now()}`;

  console.log(`\n📤 Syndicating ${picks.length} picks to syndicated_picks...`);

  const records = picks.map((pick, index) => {
    const gameId = pick.id || pick.game_id ||
      `${(pick.league || pick.sport || 'sport').toLowerCase()}-${(pick.home_team || '').replace(/\s+/g, '-')}-${(pick.away_team || '').replace(/\s+/g, '-')}-${today}`;

    return {
      batch_id: batchId,
      tier: (pick.confidence || 0) >= 80 ? 'elite' : (pick.confidence || 0) >= 65 ? 'premium' : 'free',
      pick_index: index,
      game_id: gameId,
      sport: (pick.sport || pick.league || 'unknown').toUpperCase(),
      home_team: pick.home_team || null,
      away_team: pick.away_team || null,
      pick_selection: pick.pick || null,
      confidence: pick.confidence || null,
      odds: pick.odds || null,
      expected_value: pick.expected_value || null,
      edge: pick.value_bet_edge || null,
      analysis: pick.analysis || null,
      game_time: pick.game_time || null,
      recommended_line: pick.recommended_line || null,
      mc_win_probability: pick.mc_win_probability || null,
      pick_type: pick.pick_type || 'MONEYLINE',
      created_at: new Date().toISOString(),
      raw_data: pick,
      source_file: path.basename(sourceFile),
    };
  });

  // Insert in batches of 50
  // Resilient: if a column is missing (PGRST204), strip it and retry
  const BATCH_SIZE = 50;
  const OPTIONAL_COLS = ['game_time', 'source_file', 'recommended_line', 'mc_win_probability', 'pick_type', 'raw_data'];
  let inserted = 0;
  const errors: string[] = [];
  const stripCols: string[] = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    let batch: any[] = records.slice(i, i + BATCH_SIZE);
    if (stripCols.length > 0) {
      batch = batch.map(r => { const c = { ...r }; stripCols.forEach(k => delete (c as any)[k]); return c; });
    }
    const { error } = await supabase.from('syndicated_picks').insert(batch);
    if (error) {
      if (error.code === 'PGRST204') {
        const match = error.message.match(/\'([^']+)\' column/);
        const badCol = match?.[1];
        if (badCol && OPTIONAL_COLS.includes(badCol) && !stripCols.includes(badCol)) {
          console.warn(`   ⚠️  Column '${badCol}' missing — stripping and retrying batch`);
          stripCols.push(badCol);
          const cleanBatch = batch.map(r => { const c = { ...r }; stripCols.forEach(k => delete (c as any)[k]); return c; });
          const { error: retryErr } = await supabase.from('syndicated_picks').insert(cleanBatch);
          if (retryErr) {
            errors.push(retryErr.message);
            console.error(`   ❌ Retry failed: ${retryErr.message}`);
          } else {
            inserted += cleanBatch.length;
          }
        } else {
          errors.push(error.message);
          console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`);
        }
      } else {
        errors.push(error.message);
        console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`);
      }
    } else {
      inserted += batch.length;
    }
  }

  if (inserted > 0) {
    console.log(`   ✅ Inserted ${inserted} picks (batch: ${batchId})`);
  }
  if (errors.length > 0) {
    console.warn(`   ⚠️ ${errors.length} batch error(s) — table may need schema update`);
    console.warn(`   First error: ${errors[0]}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(50));
  console.log('PROGNO → SYNDICATED_PICKS SYNDICATION');
  console.log('='.repeat(50));

  const filePath = findPredictionsFile();
  if (!filePath) {
    console.error('❌ No predictions file found. Pass a path as argument or ensure apps/progno/predictions-YYYY-MM-DD.json exists.');
    process.exit(1);
  }

  console.log(`📂 Loading: ${filePath}`);
  const picks = loadPicks(filePath);

  if (picks.length === 0) {
    console.log('ℹ️ No picks to syndicate.');
    process.exit(0);
  }

  console.log(`📊 Found ${picks.length} picks`);
  picks.forEach((p, i) => {
    console.log(`   ${i + 1}. [${p.sport || p.league}] ${p.pick} (conf: ${p.confidence}%, edge: ${p.value_bet_edge})`);
  });

  await syndicatePicks(picks, filePath);

  console.log('\n✅ Syndication complete');
  console.log('   prognostication /api/picks/today will now serve real data');
  console.log('   prognostication /api/kalshi/sports will now serve real data');
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
