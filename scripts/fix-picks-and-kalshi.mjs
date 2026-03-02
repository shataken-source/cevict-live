// Fix picks table pick_value constraint + find valid Kalshi status values
import fs from 'fs';

const VAULT_PATH = 'C:\\Cevict_Vault\\env-store.json';
let secrets = {};
try { secrets = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8')).secrets || {}; } catch { process.exit(1); }

const SB_URL = secrets.NEXT_PUBLIC_SUPABASE_URL || secrets.SUPABASE_URL;
const SB_KEY = secrets.SUPABASE_SERVICE_ROLE_KEY || secrets.SUPABASE_SERVICE_KEY;
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

// 1. Check if pick_value column exists
console.log('--- CHECK pick_value COLUMN ---');
try {
  const r = await fetch(`${SB_URL}/rest/v1/picks?select=pick_value&limit=0`, { headers: sbHeaders });
  if (r.ok) {
    console.log('  ✅ pick_value column EXISTS — this is the NOT NULL blocker');
  } else {
    console.log('  ❌ pick_value does not exist');
  }
} catch (e) { console.error('  ERROR:', e.message); }

// 2. Check actual_bets status values by looking at existing rows
console.log('\n--- ACTUAL_BETS STATUS VALUES ---');
try {
  const r = await fetch(`${SB_URL}/rest/v1/actual_bets?select=id,status,result&order=created_at.desc&limit=15`, { headers: sbHeaders });
  const bets = await r.json();
  const statuses = [...new Set(bets.map(b => b.status))];
  const results = [...new Set(bets.map(b => b.result).filter(Boolean))];
  console.log(`  Existing statuses: ${statuses.join(', ')}`);
  console.log(`  Existing results: ${results.join(', ')}`);
  bets.forEach(b => console.log(`    id=${b.id} status=${b.status} result=${b.result}`));
} catch (e) { console.error('  ERROR:', e.message); }

// 3. Try different status values for the Kalshi settle
console.log('\n--- TEST KALSHI STATUS VALUES ---');
const possibleStatuses = ['settled', 'won', 'lost', 'completed', 'closed', 'resolved', 'graded'];
for (const status of possibleStatuses) {
  try {
    // Test with a fake ID to see if constraint allows it
    const r = await fetch(`${SB_URL}/rest/v1/actual_bets?id=eq.00000000-0000-0000-0000-000000000000`, {
      method: 'PATCH',
      headers: sbHeaders,
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      console.log(`  ✅ status='${status}' — accepted (0 rows matched, no error)`);
    } else {
      const err = await r.text();
      if (err.includes('status_check')) {
        console.log(`  ❌ status='${status}' — rejected by constraint`);
      } else {
        console.log(`  ⚠️ status='${status}' — ${err.substring(0, 100)}`);
      }
    }
  } catch { }
}

// 4. Check all actual_bets columns
console.log('\n--- ACTUAL_BETS COLUMNS ---');
const betCols = ['id', 'status', 'result', 'ticker', 'side', 'contracts', 'stake_cents', 'profit_cents', 'settled_at', 'created_at', 'updated_at', 'event_ticker', 'market_ticker', 'team', 'pick_team', 'opponent', 'league', 'sport', 'confidence', 'game_date', 'market_title', 'yes_price', 'no_price', 'order_id', 'kalshi_order_id', 'source', 'dry_run'];
for (const col of betCols) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/actual_bets?select=${col}&limit=0`, { headers: sbHeaders });
    if (r.ok) process.stdout.write(`✅${col} `);
  } catch { }
}
console.log('');

console.log('\n========== DONE ==========\n');
