// Settle Kalshi bets + fix picks table pick_value constraint
import fs from 'fs';

const VAULT_PATH = 'C:\\Cevict_Vault\\env-store.json';
let secrets = {};
try { secrets = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8')).secrets || {}; } catch { process.exit(1); }

const SB_URL = secrets.NEXT_PUBLIC_SUPABASE_URL || secrets.SUPABASE_URL;
const SB_KEY = secrets.SUPABASE_SERVICE_ROLE_KEY || secrets.SUPABASE_SERVICE_KEY;
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

// 1. Settle Kalshi bets with correct status values (won/lost, not settled)
console.log('--- SETTLING KALSHI BETS ---');

// MIN@DEN: MIN won 117-108, bet was YES on DEN → LOSS
try {
  const r = await fetch(`${SB_URL}/rest/v1/actual_bets?ticker=eq.KXNBAGAME-26MAR01MINDEN-DEN`, {
    method: 'PATCH',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({ result: 'loss', status: 'lost', settled_at: new Date().toISOString() }),
  });
  if (r.ok) {
    const data = await r.json();
    console.log(`  ✅ MIN@DEN settled: LOSS (MIN won 117-108, bet was YES DEN)`);
  } else {
    console.log(`  ❌ MIN@DEN: ${await r.text()}`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

// SAS@NYK: NYK won 114-89, bet was YES on NYK → WIN
try {
  const r = await fetch(`${SB_URL}/rest/v1/actual_bets?ticker=eq.KXNBAGAME-26MAR01SASNYK-NYK`, {
    method: 'PATCH',
    headers: { ...sbHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({ result: 'win', status: 'won', settled_at: new Date().toISOString() }),
  });
  if (r.ok) {
    const data = await r.json();
    console.log(`  ✅ SAS@NYK settled: WIN (NYK won 114-89, bet was YES NYK)`);
  } else {
    console.log(`  ❌ SAS@NYK: ${await r.text()}`);
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 2. Fix picks table: ALTER pick_value to allow NULL
// We need to use Supabase's SQL editor or RPC. Let's try the RPC approach.
console.log('\n--- FIX PICKS TABLE pick_value NOT NULL ---');

// Check if there's an RPC to run SQL
// Supabase doesn't expose raw SQL via PostgREST unless there's an rpc function
// We'll need to document the SQL fix for the user to run in Supabase dashboard
console.log('  The picks table has a NOT NULL constraint on "pick_value" column.');
console.log('  This column is never populated by the cron or picks API.');
console.log('  Fix SQL (run in Supabase SQL Editor):');
console.log('');
console.log('    ALTER TABLE picks ALTER COLUMN pick_value DROP NOT NULL;');
console.log('');
console.log('  Or add a default:');
console.log('');
console.log("    ALTER TABLE picks ALTER COLUMN pick_value SET DEFAULT '';");
console.log('');

// 3. Verify Kalshi settle results
console.log('--- VERIFY KALSHI SETTLE ---');
try {
  const r = await fetch(`${SB_URL}/rest/v1/actual_bets?game_date=eq.2026-03-01&select=ticker,status,result,stake_cents,settled_at&order=created_at.desc`, { headers: sbHeaders });
  const bets = await r.json();
  bets.forEach(b => {
    const stake = (b.stake_cents / 100).toFixed(2);
    console.log(`  ${b.ticker}: status=${b.status} result=${b.result} stake=$${stake} settled=${b.settled_at ? 'yes' : 'no'}`);
  });
} catch (e) { console.error('  ERROR:', e.message); }

// 4. Quick Kalshi P&L summary
console.log('\n--- KALSHI P&L SUMMARY ---');
try {
  const r = await fetch(`${SB_URL}/rest/v1/actual_bets?select=status,result,stake_cents,profit_cents&order=created_at.desc`, { headers: sbHeaders });
  const bets = await r.json();
  let totalStaked = 0, totalProfit = 0, wins = 0, losses = 0;
  bets.forEach(b => {
    totalStaked += (b.stake_cents || 0);
    totalProfit += (b.profit_cents || 0);
    if (b.result === 'win') wins++;
    if (b.result === 'loss') losses++;
  });
  const pending = bets.filter(b => !b.result).length;
  console.log(`  Total bets: ${bets.length} (${wins}W / ${losses}L / ${pending}P)`);
  console.log(`  Total staked: $${(totalStaked / 100).toFixed(2)}`);
  console.log(`  Total profit: $${(totalProfit / 100).toFixed(2)}`);
  console.log(`  Win rate: ${((wins / (wins + losses)) * 100).toFixed(1)}%`);
} catch (e) { console.error('  ERROR:', e.message); }

console.log('\n========== DONE ==========');
