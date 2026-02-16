/**
 * PAPER TRADING SYSTEM
 * Tracks Progno picks with virtual money - no real trading
 */

import * as fs from 'fs';
import * as path from 'path';

interface PaperTrade {
  id: string;
  date: string;
  gameTime: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  pickType: string;
  odds: number;
  confidence: number;
  edge: number;
  expectedValue: number;
  stake: number;
  potentialProfit: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  actualResult?: string;
  profitLoss?: number;
  settledAt?: string;
}

interface PaperTradingAccount {
  balance: number;
  startingBalance: number;
  totalBets: number;
  wins: number;
  losses: number;
  totalWagered: number;
  totalProfit: number;
  openBets: PaperTrade[];
  settledBets: PaperTrade[];
}

const DATA_DIR = path.join(__dirname, 'data');
const TRADES_FILE = path.join(DATA_DIR, 'paper-trades.json');
const ACCOUNT_FILE = path.join(DATA_DIR, 'paper-account.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadAccount(): PaperTradingAccount {
  try {
    if (fs.existsSync(ACCOUNT_FILE)) {
      return JSON.parse(fs.readFileSync(ACCOUNT_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('⚠️ Could not load account, creating new');
  }

  return {
    balance: 10000, // Start with $10,000 virtual
    startingBalance: 10000,
    totalBets: 0,
    wins: 0,
    losses: 0,
    totalWagered: 0,
    totalProfit: 0,
    openBets: [],
    settledBets: []
  };
}

function saveAccount(account: PaperTradingAccount): void {
  fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
}

function calculateStake(confidence: number, edge: number, balance: number, odds: number): number {
  // Flat betting: $100 per bet, cap at 2% of balance
  const baseStake = 100;
  const maxStake = balance * 0.02;
  return Math.min(baseStake, maxStake);
}

function calculatePotentialProfit(stake: number, odds: number): number {
  if (odds > 0) {
    return stake * (odds / 100);
  } else {
    return stake * (100 / Math.abs(odds));
  }
}

function placePaperTrade(pick: any): PaperTrade | null {
  const account = loadAccount();

  // Only bet 80%+ confidence
  if (pick.confidence < 80) {
    console.log(`⚠️ Skipping ${pick.pick} - confidence ${pick.confidence}% below 80% threshold`);
    return null;
  }

  const stake = calculateStake(pick.confidence, pick.value_bet_edge, account.balance, pick.odds);
  const potentialProfit = calculatePotentialProfit(stake, pick.odds);

  const trade: PaperTrade = {
    id: `PT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: pick.date || new Date().toISOString().split('T')[0],
    gameTime: pick.game_time,
    sport: pick.sport,
    homeTeam: pick.home_team,
    awayTeam: pick.away_team,
    pick: pick.pick,
    pickType: pick.pick_type,
    odds: pick.odds,
    confidence: pick.confidence,
    edge: pick.value_bet_edge,
    expectedValue: pick.expected_value,
    stake,
    potentialProfit,
    status: 'pending'
  };

  // Deduct stake from balance
  account.balance -= stake;
  account.openBets.push(trade);
  account.totalBets++;
  account.totalWagered += stake;

  saveAccount(account);

  console.log(`\n✅ PAPER TRADE PLACED: ${trade.id}`);
  console.log(`   Game: ${trade.homeTeam} vs ${trade.awayTeam}`);
  console.log(`   Pick: ${trade.pick} (${trade.odds > 0 ? '+' : ''}${trade.odds})`);
  console.log(`   Confidence: ${trade.confidence}% | Edge: ${trade.edge.toFixed(1)}%`);
  console.log(`   Stake: $${trade.stake.toFixed(2)} | Potential Profit: $${trade.potentialProfit.toFixed(2)}`);
  console.log(`   Virtual Balance: $${account.balance.toFixed(2)}`);

  return trade;
}

function settleTrade(tradeId: string, won: boolean, actualResult?: string): void {
  const account = loadAccount();
  const tradeIndex = account.openBets.findIndex(t => t.id === tradeId);

  if (tradeIndex === -1) {
    console.log(`❌ Trade ${tradeId} not found`);
    return;
  }

  const trade = account.openBets[tradeIndex];
  trade.status = won ? 'won' : 'lost';
  trade.actualResult = actualResult;
  trade.settledAt = new Date().toISOString();

  if (won) {
    trade.profitLoss = trade.potentialProfit;
    account.balance += trade.stake + trade.potentialProfit;
    account.wins++;
    account.totalProfit += trade.profitLoss;
    console.log(`\n🎉 TRADE WON: ${trade.id}`);
    console.log(`   Profit: $${trade.profitLoss.toFixed(2)}`);
  } else {
    trade.profitLoss = -trade.stake;
    account.losses++;
    account.totalProfit += trade.profitLoss;
    console.log(`\n😞 TRADE LOST: ${trade.id}`);
    console.log(`   Loss: $${Math.abs(trade.profitLoss).toFixed(2)}`);
  }

  // Move to settled
  account.openBets.splice(tradeIndex, 1);
  account.settledBets.push(trade);

  saveAccount(account);

  console.log(`   New Balance: $${account.balance.toFixed(2)}`);
  console.log(`   Total P&L: $${account.totalProfit.toFixed(2)} (${(account.totalProfit / account.startingBalance * 100).toFixed(1)}%)`);
}

function showStatus(): void {
  const account = loadAccount();

  console.log('\n' + '='.repeat(60));
  console.log('📊 PAPER TRADING ACCOUNT STATUS');
  console.log('='.repeat(60));

  console.log(`\n💰 Account Summary`);
  console.log(`   Starting Balance: $${account.startingBalance.toLocaleString()}`);
  console.log(`   Current Balance:  $${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
  console.log(`   Total P&L:        $${account.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${(account.totalProfit / account.startingBalance * 100).toFixed(1)}%)`);

  console.log(`\n📈 Betting Stats`);
  console.log(`   Total Bets: ${account.totalBets}`);
  console.log(`   Wins:       ${account.wins} (${account.totalBets > 0 ? (account.wins / account.totalBets * 100).toFixed(1) : 0}%)`);
  console.log(`   Losses:     ${account.losses}`);
  console.log(`   Total Wagered: $${account.totalWagered.toFixed(2)}`);

  if (account.openBets.length > 0) {
    console.log(`\n🎯 Open Bets (${account.openBets.length})`);
    account.openBets.forEach(trade => {
      const gameTime = new Date(trade.gameTime).toLocaleString();
      console.log(`   ${trade.id}`);
      console.log(`   ${trade.homeTeam} vs ${trade.awayTeam}`);
      console.log(`   Pick: ${trade.pick} @ ${trade.odds > 0 ? '+' : ''}${trade.odds}`);
      console.log(`   Stake: $${trade.stake.toFixed(2)} | Game: ${gameTime}\n`);
    });
  }

  if (account.settledBets.length > 0) {
    console.log(`\n✅ Recent Settled Bets (last 5)`);
    account.settledBets.slice(-5).reverse().forEach(trade => {
      const result = trade.status === 'won' ? '✅' : '❌';
      const pnl = trade.profitLoss || 0;
      const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
      console.log(`   ${result} ${trade.pick} ${pnlStr} (${trade.homeTeam} vs ${trade.awayTeam})`);
    });
  }
}

function placeTodaysPicks(): void {
  // Today's picks from the user's message (Feb 16, 2026)
  const todaysPicks = [
    {
      date: "2026-02-16",
      sport: "NCAAB",
      home_team: "Duke Blue Devils",
      away_team: "Syracuse Orange",
      pick: "Syracuse Orange",
      pick_type: "MONEYLINE",
      odds: 1600,
      confidence: 92,
      game_time: "2026-02-17T00:00:00Z",
      value_bet_edge: 85.91,
      expected_value: 150
    },
    {
      date: "2026-02-16",
      sport: "NCAAB",
      home_team: "Alabama St Hornets",
      away_team: "Miss Valley St Delta Devils",
      pick: "Miss Valley St Delta Devils",
      pick_type: "MONEYLINE",
      odds: 800,
      confidence: 92,
      game_time: "2026-02-17T00:00:00Z",
      value_bet_edge: 70.74,
      expected_value: 150
    },
    {
      date: "2026-02-16",
      sport: "NCAAB",
      home_team: "Northwestern St Demons",
      away_team: "McNeese Cowboys",
      pick: "Northwestern St Demons",
      pick_type: "MONEYLINE",
      odds: 650,
      confidence: 92,
      game_time: "2026-02-17T00:30:00Z",
      value_bet_edge: 74.19,
      expected_value: 150
    }
  ];

  console.log('\n' + '='.repeat(60));
  console.log('🎯 PLACING TODAY\'S PROGNO PICKS (PAPER TRADING)');
  console.log('='.repeat(60));

  for (const pick of todaysPicks) {
    placePaperTrade(pick);
  }

  showStatus();
}

// CLI Commands
const command = process.argv[2];

switch (command) {
  case 'place':
    placeTodaysPicks();
    break;

  case 'status':
    showStatus();
    break;

  case 'win':
    settleTrade(process.argv[3], true, process.argv[4]);
    break;

  case 'loss':
    settleTrade(process.argv[3], false, process.argv[4]);
    break;

  case 'reset':
    fs.unlinkSync(ACCOUNT_FILE);
    console.log('✅ Paper trading account reset');
    break;

  default:
    console.log(`
🎯 Paper Trading System for Progno Picks

Usage:
  npm run paper place        - Place today's Progno picks
  npm run paper status       - Show account status & open bets
  npm run paper win <id>     - Settle trade as win
  npm run paper loss <id>   - Settle trade as loss
  npm run paper reset        - Reset account to $10,000

Examples:
  npm run paper place
  npm run paper win PT-1234567890
  npm run paper loss PT-1234567890 "Syracuse lost by 10"
`);
}

export { placePaperTrade, settleTrade, showStatus };
