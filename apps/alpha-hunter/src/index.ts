/**
 * Alpha Hunter - Main Entry Point
 * Autonomous profit-hunting bot with fund management
 *
 * Commands:
 *   npm run dev        - Start with file watching
 *   npm run daily      - Run daily hunter
 *   npm run scan       - Just scan for opportunities
 *   npm run test       - Test run with simulated data
 */

import 'dotenv/config';
import { CronJob } from 'cron';
import { AIBrain } from './ai-brain';
import { UnifiedFundManager } from './fund-manager';
import { SMSNotifier } from './sms-notifier';
import { KalshiTrader } from './intelligence/kalshi-trader';
import { PrognoIntegration } from './intelligence/progno-integration';
import { checkSetup } from './setup-check';

// Validate setup before starting
const setup = checkSetup();
if (!setup.ok) {
  console.log('\n🔧 Alpha Hunter Setup Required:\n');
  setup.issues.forEach(issue => console.log(`  ${issue}`));
  console.log('\n📖 See README.md for setup instructions\n');
  process.exit(1);
}

class AlphaHunter {
  private brain: AIBrain;
  private funds: UnifiedFundManager;
  private sms: SMSNotifier;
  private kalshi: KalshiTrader;
  private progno: PrognoIntegration;
  private jobs: CronJob[] = [];

  constructor() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     █████╗ ██╗     ██████╗ ██╗  ██╗ █████╗                   ║
║    ██╔══██╗██║     ██╔══██╗██║  ██║██╔══██╗                  ║
║    ███████║██║     ██████╔╝███████║███████║                  ║
║    ██╔══██║██║     ██╔═══╝ ██╔══██║██╔══██║                  ║
║    ██║  ██║███████╗██║     ██║  ██║██║  ██║                  ║
║    ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝                  ║
║                                                              ║
║    ██╗  ██╗██╗   ██╗███╗   ██╗████████╗███████╗██████╗       ║
║    ██║  ██║██║   ██║████╗  ██║╚══██╔══╝██╔════╝██╔══██╗      ║
║    ███████║██║   ██║██╔██╗ ██║   ██║   █████╗  ██████╔╝      ║
║    ██╔══██║██║   ██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗      ║
║    ██║  ██║╚██████╔╝██║ ╚████║   ██║   ███████╗██║  ██║      ║
║    ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝      ║
║                                                              ║
║              🦅 Autonomous Profit Hunter v1.0 🦅              ║
║              Target: $250/day | AI-Powered Trading           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);

    this.brain = new AIBrain();
    this.funds = new UnifiedFundManager();
    this.sms = new SMSNotifier();
    this.kalshi = new KalshiTrader();
    this.progno = new PrognoIntegration();
  }

  async initialize(): Promise<void> {
    console.log('\n🔧 Initializing Alpha Hunter...\n');

    // Check account
    const account = await this.funds.getAccount();
    console.log(`💰 Account Balance: $${account.balance.toFixed(2)}`);
    console.log(`📊 Available Funds: $${account.availableFunds.toFixed(2)}`);
    console.log(`📈 Total Profit: $${account.totalProfit.toFixed(2)}`);

    // Check integrations
    console.log('\n🔌 Checking integrations...');

    const kalshiBalance = await this.kalshi.getBalance();
    console.log(`   ├─ Kalshi: ${kalshiBalance > 0 ? '✅ Connected' : '⚠️ Demo mode'} ($${kalshiBalance})`);

    const prognoStatus = process.env.PROGNO_BASE_URL ? '✅ Connected' : '⚠️ Using defaults';
    console.log(`   ├─ PROGNO: ${prognoStatus}`);

    const smsStatus = this.sms.isConfigured() ? '✅ Configured' : '⚠️ Disabled';
    console.log(`   └─ SMS: ${smsStatus}`);

    // Setup scheduled jobs
    this.setupScheduledJobs();

    console.log('\n✅ Alpha Hunter initialized!\n');
  }

  private setupScheduledJobs(): void {
    console.log('\n📅 Setting up scheduled jobs...');
    const tz = (process.env.ALPHA_TIMEZONE || 'America/New_York').trim();

    const morningScan = new CronJob('0 6 * * *', async () => {
      console.log('\n🌅 Morning scan starting...');
      await this.runDailyScan();
    }, null, false, tz);
    this.jobs.push(morningScan);
    console.log(`   ├─ Morning scan: 6:00 AM (${tz})`);

    const mainHunt = new CronJob('0 9 * * *', async () => {
      console.log('\n🦅 Main hunt starting...');
      await this.runDailyHunt();
    }, null, false, tz);
    this.jobs.push(mainHunt);
    console.log(`   ├─ Main hunt: 9:00 AM (${tz})`);

    const middayCheck = new CronJob('0 12 * * *', async () => {
      console.log('\n☀️ Midday check...');
      await this.checkProgress();
    }, null, false, tz);
    this.jobs.push(middayCheck);
    console.log(`   ├─ Midday check: 12:00 PM (${tz})`);

    const sportsScan = new CronJob('0 17 * * *', async () => {
      console.log('\n🏈 Evening sports scan...');
      await this.runSportsScan();
    }, null, false, tz);
    this.jobs.push(sportsScan);
    console.log(`   ├─ Sports scan: 5:00 PM (${tz})`);

    const nightlySummary = new CronJob('0 22 * * *', async () => {
      console.log('\n🌙 Nightly summary...');
      await this.sendDailySummary();
    }, null, false, tz);
    this.jobs.push(nightlySummary);
    console.log(`   ├─ Nightly summary: 10:00 PM (${tz})`);

    const dailyReset = new CronJob('0 0 * * *', async () => {
      console.log('\n🔄 Resetting daily counters...');
      await this.funds.resetDailyCounters();
    }, null, false, tz);
    this.jobs.push(dailyReset);
    console.log(`   └─ Daily reset: 12:00 AM (${tz})`);
  }

  startScheduler(): void {
    console.log('\n🚀 Starting scheduler...');
    this.jobs.forEach(job => job.start());
    console.log('✅ Scheduler running. Press Ctrl+C to stop.\n');
  }

  stopScheduler(): void {
    console.log('\n⏹️ Stopping scheduler...');
    this.jobs.forEach(job => job.stop());
  }

  async runDailyScan(): Promise<void> {
    const analysis = await this.brain.analyzeAllSources();

    if (analysis.topOpportunity) {
      const account = await this.funds.getAccount();
      const suggestion = await this.brain.generateDailySuggestion(account.balance);
      await this.sms.sendDailySuggestion(suggestion);
    }
  }

  async runDailyHunt(): Promise<void> {
    const { runDailyHunt: run } = await import('./daily-hunter.js');
    await run();
  }

  async runSportsScan(): Promise<void> {
    console.log('🏈 Scanning sports opportunities...');

    const picks = await this.progno.getTodaysPicks();
    const opportunities = await this.progno.convertToOpportunities(picks);
    const arbitrage = await this.progno.getArbitrageOpportunities();

    const totalOpps = opportunities.length + arbitrage.length;
    console.log(`   Found ${totalOpps} opportunities`);

    if (arbitrage.length > 0) {
      // Alert about arbitrage immediately
      const best = arbitrage[0];
      await this.sms.sendOpportunityAlert(
        best.title,
        best.confidence,
        best.expectedValue,
        best.action.instructions.join(' | ')
      );
    }

    if (opportunities.length > 0) {
      const best = opportunities.sort((a, b) => b.confidence - a.confidence)[0];
      if (best.confidence >= 70) {
        await this.sms.sendOpportunityAlert(
          best.title,
          best.confidence,
          best.expectedValue,
          `PROGNO Pick: ${best.action.target}`
        );
      }
    }
  }

  async checkProgress(): Promise<void> {
    const account = await this.funds.getAccount();
    const target = parseFloat(process.env.DAILY_PROFIT_TARGET || '250');
    const progress = (account.todayProfit / target) * 100;

    console.log(`\n📊 Progress Check:`);
    console.log(`   Today's P&L: ${account.todayProfit >= 0 ? '+' : ''}$${account.todayProfit.toFixed(2)}`);
    console.log(`   Target: $${target}`);
    console.log(`   Progress: ${progress.toFixed(1)}%`);

    if (progress >= 100) {
      await this.sms.sendAlert(
        'Target Reached! 🎉',
        `Daily target of $${target} hit!\nTotal: $${account.todayProfit.toFixed(2)}\n\nResting for the day.`
      );
    } else if (progress >= 50) {
      await this.sms.sendAlert(
        'Halfway There! 📈',
        `50% of daily target reached.\nCurrent: $${account.todayProfit.toFixed(2)} / $${target}`
      );
    }
  }

  async sendDailySummary(): Promise<void> {
    const account = await this.funds.getAccount();
    const trades = await this.funds.getOpenTrades();

    // In production, this would calculate actual wins/losses
    const wins = 0;
    const losses = 0;

    await this.sms.sendDailySummary(
      trades.length,
      wins,
      losses,
      account.todayProfit,
      account.balance
    );
  }

  async deposit(amount: number): Promise<void> {
    await this.funds.deposit(amount, 'manual');
  }

  async withdraw(amount: number): Promise<void> {
    await this.funds.withdraw(amount, 'manual');
  }

  async status(): Promise<void> {
    const account = await this.funds.getAccount();
    const stats = await this.funds.getPerformanceStats();
    const openTrades = await this.funds.getOpenTrades();

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║          🦅 ALPHA HUNTER STATUS           ║');
    console.log('╠═══════════════════════════════════════════╣');
    console.log(`║  💰 Balance:      $${account.balance.toFixed(2).padEnd(18)}║`);
    console.log(`║  📊 Available:    $${account.availableFunds.toFixed(2).padEnd(18)}║`);
    console.log(`║  🔒 Allocated:    $${account.allocatedFunds.toFixed(2).padEnd(18)}║`);
    console.log('╠═══════════════════════════════════════════╣');
    console.log(`║  📈 Today P&L:    ${account.todayProfit >= 0 ? '+' : ''}$${account.todayProfit.toFixed(2).padEnd(17)}║`);
    console.log(`║  🎯 Target:       $${parseFloat(process.env.DAILY_PROFIT_TARGET || '250').toFixed(2).padEnd(18)}║`);
    console.log(`║  📊 Total P&L:    ${account.totalProfit >= 0 ? '+' : ''}$${account.totalProfit.toFixed(2).padEnd(17)}║`);
    console.log('╠═══════════════════════════════════════════╣');
    console.log(`║  📈 Trades:       ${stats.totalTrades}`.padEnd(41) + '║');
    console.log(`║  🎯 Win Rate:     ${stats.winRate.toFixed(1)}%`.padEnd(41) + '║');
    console.log(`║  📂 Open:         ${openTrades.length}`.padEnd(41) + '║');
    console.log('╚═══════════════════════════════════════════╝\n');
  }
}

// Main
async function main() {
  const hunter = new AlphaHunter();
  await hunter.initialize();

  const command = process.argv[2];

  switch (command) {
    case 'start':
    case 'run':
      hunter.startScheduler();
      // Keep alive
      process.on('SIGINT', () => {
        hunter.stopScheduler();
        process.exit(0);
      });
      break;

    case 'hunt':
      await hunter.runDailyHunt();
      break;

    case 'scan':
      await hunter.runDailyScan();
      break;

    case 'sports':
      await hunter.runSportsScan();
      break;

    case 'status':
      await hunter.status();
      break;

    case 'deposit':
      const depositAmount = parseFloat(process.argv[3] || '0');
      if (depositAmount > 0) {
        await hunter.deposit(depositAmount);
      } else {
        console.log('Usage: npm start deposit <amount>');
      }
      break;

    case 'withdraw':
      const withdrawAmount = parseFloat(process.argv[3] || '0');
      if (withdrawAmount > 0) {
        await hunter.withdraw(withdrawAmount);
      } else {
        console.log('Usage: npm start withdraw <amount>');
      }
      break;

    default:
      if ((process.env.ALPHA_AUTO_START || '').trim() === '1') {
        hunter.startScheduler();
        // Keep alive so cron jobs can run
        process.on('SIGINT', () => {
          hunter.stopScheduler();
          process.exit(0);
        });
      } else {
        console.log('Usage:');
        console.log('  npm start run      - Start scheduler');
        console.log('  npm start hunt     - Run main hunt now');
        console.log('  npm start scan     - Run single scan');
        console.log('  npm start sports   - Scan sports only');
        console.log('  npm start status   - Show status');
        console.log('  npm start deposit <amount>');
        console.log('  npm start withdraw <amount>');
      }
      break;
  }
}

main().catch(console.error);

// Auto-start scheduler in dev if enabled via env
if ((process.env.ALPHA_AUTO_START || '').trim() === '1') {
  // Minimal async bootstrap to ensure initialize() has run
  setTimeout(() => {
    try {
      const hunter = (global as any).alphaHunterInstance as any;
      if (hunter && typeof hunter.startScheduler === 'function') hunter.startScheduler();
    } catch { }
  }, 0);
}

export { AlphaHunter };

