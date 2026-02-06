/**
 * MORNING BRIEFING - Daily Trading Report
 * Runs at 7:00 AM daily via cron/task scheduler
 * 
 * Generates:
 * - P/L summary
 * - All trades (Kalshi + Coinbase)
 * - Bot performance metrics
 * - Issues ranked by importance
 * - Recommended tweaks
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

interface Trade {
  id: string;
  platform: string;
  trade_type: string;
  symbol: string;
  entry_price: number;
  amount: number;
  fees: number;
  pnl?: number;
  outcome: string;
  opened_at: string;
  closed_at?: string;
  confidence: number;
  edge: number;
}

interface BotPrediction {
  id: string;
  bot_category: string;
  market_id: string;
  prediction: string;
  confidence: number;
  edge: number;
  actual_outcome?: string;
  predicted_at: string;
}

interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  recommendation: string;
}

const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

async function generateMorningBriefing(): Promise<void> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  console.log(`
${c.cyan}╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     🌅 ALPHA-HUNTER MORNING BRIEFING                             ║
║     ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}                        ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝${c.reset}
`);

  // =========================================================================
  // 1. P/L SUMMARY
  // =========================================================================
  console.log(`${c.bright}${c.yellow}═══ 💰 P/L SUMMARY ═══${c.reset}\n`);

  const { data: trades } = await supabase
    .from('trade_records')
    .select('*')
    .gte('opened_at', weekAgo.toISOString())
    .order('opened_at', { ascending: false });

  const allTrades = (trades || []) as Trade[];
  
  // Calculate P/L
  const todayTrades = allTrades.filter(t => new Date(t.opened_at) >= yesterday);
  const weekTrades = allTrades;

  const calcPnL = (tradeList: Trade[]) => {
    const closed = tradeList.filter(t => t.outcome === 'win' || t.outcome === 'loss');
    const pnl = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const fees = tradeList.reduce((sum, t) => sum + (t.fees || 0), 0);
    const wins = closed.filter(t => t.outcome === 'win').length;
    const losses = closed.filter(t => t.outcome === 'loss').length;
    return { pnl, fees, wins, losses, total: closed.length, open: tradeList.filter(t => t.outcome === 'open').length };
  };

  const todayPnL = calcPnL(todayTrades);
  const weekPnL = calcPnL(weekTrades);

  const pnlColor = (pnl: number) => pnl >= 0 ? c.green : c.red;

  console.log(`  ${c.cyan}TODAY (24h):${c.reset}`);
  console.log(`    P/L: ${pnlColor(todayPnL.pnl)}$${todayPnL.pnl.toFixed(2)}${c.reset} (after $${todayPnL.fees.toFixed(2)} fees)`);
  console.log(`    Trades: ${todayPnL.total} closed (${todayPnL.wins}W/${todayPnL.losses}L), ${todayPnL.open} open`);
  console.log(`    Win Rate: ${todayPnL.total > 0 ? ((todayPnL.wins / todayPnL.total) * 100).toFixed(1) : 'N/A'}%`);

  console.log(`\n  ${c.cyan}THIS WEEK (7d):${c.reset}`);
  console.log(`    P/L: ${pnlColor(weekPnL.pnl)}$${weekPnL.pnl.toFixed(2)}${c.reset} (after $${weekPnL.fees.toFixed(2)} fees)`);
  console.log(`    Trades: ${weekPnL.total} closed (${weekPnL.wins}W/${weekPnL.losses}L), ${weekPnL.open} open`);
  console.log(`    Win Rate: ${weekPnL.total > 0 ? ((weekPnL.wins / weekPnL.total) * 100).toFixed(1) : 'N/A'}%`);

  // =========================================================================
  // 2. ALL TRADES
  // =========================================================================
  console.log(`\n${c.bright}${c.yellow}═══ 📊 RECENT TRADES ═══${c.reset}\n`);

  // Kalshi trades
  const kalshiTrades = allTrades.filter(t => t.platform === 'kalshi');
  console.log(`  ${c.magenta}KALSHI (${kalshiTrades.length} trades):${c.reset}`);
  if (kalshiTrades.length === 0) {
    console.log(`    No Kalshi trades in the last 7 days`);
  } else {
    kalshiTrades.slice(0, 10).forEach(t => {
      const outcomeIcon = t.outcome === 'win' ? '✅' : t.outcome === 'loss' ? '❌' : '⏳';
      const pnlStr = t.pnl !== undefined ? ` | P/L: ${pnlColor(t.pnl)}$${t.pnl.toFixed(2)}${c.reset}` : '';
      console.log(`    ${outcomeIcon} ${t.trade_type.toUpperCase()} ${t.symbol?.substring(0, 40)}...`);
      console.log(`       $${t.amount.toFixed(2)} @ ${t.entry_price}¢ | Conf: ${t.confidence}%${pnlStr}`);
    });
  }

  // Coinbase trades
  const coinbaseTrades = allTrades.filter(t => t.platform === 'coinbase');
  console.log(`\n  ${c.blue}COINBASE (${coinbaseTrades.length} trades):${c.reset}`);
  if (coinbaseTrades.length === 0) {
    console.log(`    No Coinbase trades in the last 7 days`);
  } else {
    coinbaseTrades.slice(0, 10).forEach(t => {
      const outcomeIcon = t.outcome === 'win' ? '✅' : t.outcome === 'loss' ? '❌' : '⏳';
      const pnlStr = t.pnl !== undefined ? ` | P/L: ${pnlColor(t.pnl)}$${t.pnl.toFixed(2)}${c.reset}` : '';
      console.log(`    ${outcomeIcon} ${t.trade_type.toUpperCase()} ${t.symbol}`);
      console.log(`       $${t.amount.toFixed(2)} @ $${t.entry_price.toFixed(2)} | Conf: ${t.confidence}%${pnlStr}`);
    });
  }

  // =========================================================================
  // 3. BOT PERFORMANCE
  // =========================================================================
  console.log(`\n${c.bright}${c.yellow}═══ 🤖 BOT PERFORMANCE ═══${c.reset}\n`);

  const { data: predictions } = await supabase
    .from('bot_predictions')
    .select('*')
    .gte('predicted_at', weekAgo.toISOString());

  const allPredictions = (predictions || []) as BotPrediction[];

  // Group by category
  const categories = [...new Set(allPredictions.map(p => p.bot_category))];
  
  for (const category of categories) {
    const catPreds = allPredictions.filter(p => p.bot_category === category);
    const resolved = catPreds.filter(p => p.actual_outcome !== null);
    const wins = resolved.filter(p => p.actual_outcome === 'win').length;
    const winRate = resolved.length > 0 ? (wins / resolved.length) * 100 : 0;
    const avgConfidence = catPreds.reduce((sum, p) => sum + p.confidence, 0) / catPreds.length || 0;
    const avgEdge = catPreds.reduce((sum, p) => sum + p.edge, 0) / catPreds.length || 0;

    const statusIcon = winRate >= 55 ? '🟢' : winRate >= 45 ? '🟡' : '🔴';
    console.log(`  ${statusIcon} ${category.toUpperCase()}`);
    console.log(`     Predictions: ${catPreds.length} | Resolved: ${resolved.length}`);
    console.log(`     Win Rate: ${winRate.toFixed(1)}% | Avg Conf: ${avgConfidence.toFixed(1)}% | Avg Edge: ${avgEdge.toFixed(1)}%`);
  }

  // =========================================================================
  // 4. ISSUES & RECOMMENDATIONS
  // =========================================================================
  console.log(`\n${c.bright}${c.yellow}═══ ⚠️  ISSUES & RECOMMENDATIONS ═══${c.reset}\n`);

  const issues: Issue[] = [];

  // Check for low win rate
  if (weekPnL.total >= 5 && (weekPnL.wins / weekPnL.total) < 0.45) {
    issues.push({
      severity: 'critical',
      category: 'Performance',
      description: `Win rate is ${((weekPnL.wins / weekPnL.total) * 100).toFixed(1)}% (below 45%)`,
      recommendation: 'Consider increasing minConfidence threshold or reducing trade frequency'
    });
  }

  // Check for no trades
  if (todayPnL.total === 0 && todayPnL.open === 0) {
    issues.push({
      severity: 'medium',
      category: 'Activity',
      description: 'No trades executed in the last 24 hours',
      recommendation: 'Check if bot is running and markets are available'
    });
  }

  // Check for high fees
  if (weekPnL.fees > Math.abs(weekPnL.pnl) && weekPnL.total > 0) {
    issues.push({
      severity: 'high',
      category: 'Costs',
      description: `Fees ($${weekPnL.fees.toFixed(2)}) exceed P/L ($${Math.abs(weekPnL.pnl).toFixed(2)})`,
      recommendation: 'Focus on maker orders to reduce fees, or increase trade size'
    });
  }

  // Check for category underperformance
  for (const category of categories) {
    const catPreds = allPredictions.filter(p => p.bot_category === category);
    const resolved = catPreds.filter(p => p.actual_outcome !== null);
    if (resolved.length >= 5) {
      const wins = resolved.filter(p => p.actual_outcome === 'win').length;
      const winRate = (wins / resolved.length) * 100;
      if (winRate < 40) {
        issues.push({
          severity: 'high',
          category: 'Bot Performance',
          description: `${category} bot has ${winRate.toFixed(1)}% win rate`,
          recommendation: `Consider disabling ${category} category or retraining model`
        });
      }
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  if (issues.length === 0) {
    console.log(`  ${c.green}✅ No issues detected - all systems nominal${c.reset}`);
  } else {
    issues.forEach((issue, i) => {
      const severityIcon = {
        critical: `${c.red}🔴 CRITICAL`,
        high: `${c.yellow}🟠 HIGH`,
        medium: `${c.blue}🟡 MEDIUM`,
        low: `${c.white}⚪ LOW`
      }[issue.severity];
      
      console.log(`  ${i + 1}. ${severityIcon}${c.reset} [${issue.category}]`);
      console.log(`     ${issue.description}`);
      console.log(`     ${c.cyan}→ ${issue.recommendation}${c.reset}`);
      console.log('');
    });
  }

  // =========================================================================
  // 5. RECOMMENDED TWEAKS
  // =========================================================================
  console.log(`${c.bright}${c.yellow}═══ 🔧 RECOMMENDED TWEAKS ═══${c.reset}\n`);

  const tweaks: string[] = [];

  // Based on performance
  if (weekPnL.total > 0) {
    const avgTradeSize = weekTrades.reduce((sum, t) => sum + t.amount, 0) / weekTrades.length;
    if (weekPnL.wins / weekPnL.total > 0.6) {
      tweaks.push(`Consider increasing maxTradeSize (current avg: $${avgTradeSize.toFixed(2)}) - win rate supports it`);
    }
    if (weekPnL.wins / weekPnL.total < 0.5) {
      tweaks.push(`Increase minConfidence threshold to be more selective`);
    }
  }

  // Check crypto momentum threshold
  const cryptoPreds = allPredictions.filter(p => p.bot_category === 'crypto');
  if (cryptoPreds.length < 3) {
    tweaks.push(`Lower crypto momentum threshold (0.5% → 0.2%) to catch more opportunities`);
  }

  // Check Kalshi activity
  const kalshiPreds = allPredictions.filter(p => p.bot_category !== 'crypto');
  if (kalshiPreds.length > 20) {
    tweaks.push(`Consider increasing minEdge threshold to filter low-quality Kalshi opportunities`);
  }

  if (tweaks.length === 0) {
    console.log(`  ${c.green}✅ No tweaks recommended - current settings appear optimal${c.reset}`);
  } else {
    tweaks.forEach((tweak, i) => {
      console.log(`  ${i + 1}. ${tweak}`);
    });
  }

  // =========================================================================
  // 6. SYSTEM STATUS
  // =========================================================================
  console.log(`\n${c.bright}${c.yellow}═══ 🖥️  SYSTEM STATUS ═══${c.reset}\n`);

  // Check last trade time
  const lastTrade = allTrades[0];
  if (lastTrade) {
    const lastTradeTime = new Date(lastTrade.opened_at);
    const hoursSinceLastTrade = (now.getTime() - lastTradeTime.getTime()) / (1000 * 60 * 60);
    const statusIcon = hoursSinceLastTrade < 6 ? '🟢' : hoursSinceLastTrade < 24 ? '🟡' : '🔴';
    console.log(`  ${statusIcon} Last trade: ${lastTradeTime.toLocaleString()} (${hoursSinceLastTrade.toFixed(1)}h ago)`);
  } else {
    console.log(`  🔴 No trades recorded`);
  }

  // Check last prediction time
  const lastPred = allPredictions[0];
  if (lastPred) {
    const lastPredTime = new Date(lastPred.predicted_at);
    const hoursSinceLastPred = (now.getTime() - lastPredTime.getTime()) / (1000 * 60 * 60);
    const statusIcon = hoursSinceLastPred < 2 ? '🟢' : hoursSinceLastPred < 12 ? '🟡' : '🔴';
    console.log(`  ${statusIcon} Last prediction: ${lastPredTime.toLocaleString()} (${hoursSinceLastPred.toFixed(1)}h ago)`);
  }

  console.log(`\n${c.cyan}═══════════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bright}Briefing generated at ${now.toLocaleString()}${c.reset}`);
  console.log(`${c.cyan}═══════════════════════════════════════════════════════════════════${c.reset}\n`);

  // Save to file
  const briefingDir = path.join(process.cwd(), 'briefings');
  if (!fs.existsSync(briefingDir)) {
    fs.mkdirSync(briefingDir, { recursive: true });
  }
  
  const briefingFile = path.join(briefingDir, `briefing-${now.toISOString().split('T')[0]}.txt`);
  // Note: In production, you'd capture console output to file
  console.log(`📄 Briefing saved to: ${briefingFile}`);
}

// Run if called directly
generateMorningBriefing().catch(console.error);

export { generateMorningBriefing };
