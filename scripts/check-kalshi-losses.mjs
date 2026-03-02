// Check Kalshi losses — what happened to ~$80 yesterday
import fs from 'fs';

const VAULT_PATH = 'C:\\Cevict_Vault\\env-store.json';
let secrets = {};
try { secrets = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8')).secrets || {}; } catch { process.exit(1); }

const SB_URL = secrets.NEXT_PUBLIC_SUPABASE_URL || secrets.SUPABASE_URL;
const SB_KEY = secrets.SUPABASE_SERVICE_ROLE_KEY || secrets.SUPABASE_SERVICE_KEY;
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

// 1. Get ALL actual_bets ordered by date
console.log('--- ALL KALSHI BETS (by date desc) ---');
try {
  const r = await fetch(`${SB_URL}/rest/v1/actual_bets?select=*&order=created_at.desc`, { headers: sbHeaders });
  const bets = await r.json();
  
  let totalWon = 0, totalLost = 0;
  const byDate = {};
  
  bets.forEach(b => {
    const date = b.game_date || (b.created_at ? b.created_at.substring(0, 10) : 'unknown');
    if (!byDate[date]) byDate[date] = { wins: 0, losses: 0, staked: 0, profit: 0, bets: [] };
    
    const stake = (b.stake_cents || 0) / 100;
    const profit = (b.profit_cents || 0) / 100;
    byDate[date].staked += stake;
    byDate[date].profit += profit;
    
    if (b.result === 'win') {
      byDate[date].wins++;
      totalWon += profit;
    } else if (b.result === 'loss') {
      byDate[date].losses++;
      totalLost += stake; // lost the stake
    }
    
    byDate[date].bets.push(b);
  });
  
  console.log('\n--- DAILY BREAKDOWN ---');
  for (const [date, d] of Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]))) {
    console.log(`\n  ${date}: ${d.wins}W/${d.losses}L  staked=$${d.staked.toFixed(2)}  profit=$${d.profit.toFixed(2)}`);
    d.bets.forEach(b => {
      const stake = ((b.stake_cents || 0) / 100).toFixed(2);
      const profit = ((b.profit_cents || 0) / 100).toFixed(2);
      const marker = b.result === 'win' ? '✅' : b.result === 'loss' ? '❌' : '⏳';
      console.log(`    ${marker} ${b.ticker || b.market_title || 'unknown'} ${b.side} $${stake} profit=$${profit} [${b.status}/${b.result || 'pending'}]`);
    });
  }
  
  console.log('\n--- TOTALS ---');
  console.log(`  Total bets: ${bets.length}`);
  console.log(`  Total profit from wins: $${totalWon.toFixed(2)}`);
  console.log(`  Total lost from losses: $${totalLost.toFixed(2)}`);
  console.log(`  Net: $${(totalWon - totalLost).toFixed(2)}`);
  
  // Note: These are only the Progno bot bets. Manual bets placed directly
  // on Kalshi won't show up here.
  console.log('\n  NOTE: These are only PROGNO BOT bets. Manual positions');
  console.log('  (NHL, WTA, NBL, G7 leaders) are not tracked here.');
  
} catch (e) { console.error('  ERROR:', e.message); }
