import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { AIBrain } from './ai-brain';
import { UnifiedFundManager } from './fund-manager';
import { KalshiTrader } from './intelligence/kalshi-trader';

// --- DEBUG STRATEGY ---
const LIVE_RULES = {
  maxDaysOut: 30,
  minConfidence: 0.70,
  maxStake: 10.00
};

// ULTRA WIDE SIMULATION
const SIM_RULES = {
  maxDaysOut: 2000,
  minConfidence: 0.01
};

const HISTORY_FILE = path.resolve('C:/cevict-live/apps/alpha-hunter/trade_history.json');

export class DailyHunter {
  private brain: AIBrain;
  private funds: UnifiedFundManager;
  private kalshi: KalshiTrader;
  private history: string[];

  constructor() {
    this.kalshi = new KalshiTrader();
    this.funds = new UnifiedFundManager(this.kalshi);
    this.brain = new AIBrain();
    this.history = this.loadHistory();
  }

  private loadHistory(): string[] {
    try {
        if (fs.existsSync(HISTORY_FILE)) return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {}
    return [];
  }

  private saveHistory(id: string) {
      if (!this.history.includes(id)) {
          this.history.push(id);
          try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.history, null, 2)); } catch (e) {}
      }
  }

  async scan(filter?: { category?: string }) { await this.run(filter); }

  async run(filter?: { category?: string }) {
    console.log("\n╔════════════════════════════════════════════╗");
    console.log("║    🦅 ALPHA HUNTER: DEBUG/DIAGNOSTIC 🦅    ║");
    console.log("╚════════════════════════════════════════════╝\n");

    const account = await this.funds.getAccount();
    console.log(`💰 Real Balance: $${(account?.balance || 0).toFixed(2)}`);

    console.log("\n🧠 AI Brain analyzing market sources...");
    const opportunities = await this.brain.scan();

    if (!opportunities || opportunities.length === 0) {
      console.log("📉 No opportunities found from API.");
      return;
    }

    console.log(`🎯 FOUND ${opportunities.length} RAW CANDIDATES. ANALYZING...`);
    
    let liveCount = 0;
    let simCount = 0;
    let rejectionLogs = 0; 

    for (const opp of opportunities) {
       if (this.history.includes(opp.id)) {
           if (rejectionLogs < 5) console.log(`   ⏭️ Skipped (Duplicate): ${opp.title.substring(0,30)}...`);
           rejectionLogs++;
           continue;
       }

       let daysOut = 999;
       if (opp.closeDate) {
           const closeTime = new Date(opp.closeDate).getTime();
           const now = Date.now();
           daysOut = (closeTime - now) / (1000 * 60 * 60 * 24);
       }

       let mode = 'SKIP';
       let skipReason = '';

       if (daysOut <= LIVE_RULES.maxDaysOut && opp.confidence >= LIVE_RULES.minConfidence) {
           mode = 'LIVE';
       } else if (daysOut <= SIM_RULES.maxDaysOut && opp.confidence >= SIM_RULES.minConfidence) {
           mode = 'SIMULATION';
       } else {
           skipReason = `Days: ${daysOut.toFixed(0)} | Conf: ${(opp.confidence*100).toFixed(0)}%`;
       }

       if (mode === 'SKIP') {
           if (rejectionLogs < 10) {
               console.log(`   ⏭️ Skipped: ${opp.title.substring(0,40)}... [${skipReason}]`);
               rejectionLogs++;
           }
           continue;
       }

       console.log(`\n------------------------------------------------`);
       if (mode === 'LIVE') {
           console.log(`🚀 LIVE SIGNAL: ${opp.title}`);
       } else {
           console.log(`🧪 SIMULATION:  ${opp.title}`);
       }
       
       console.log(`   Side: ${opp.side} | Conf: ${(opp.confidence * 100).toFixed(1)}%`);
       console.log(`   Expires: ${opp.closeDate || 'Unknown'} (${daysOut.toFixed(0)} days)`);

       let stake = opp.suggestedStake || 5.00;
       if (stake > LIVE_RULES.maxStake) stake = LIVE_RULES.maxStake;

       if (mode === 'LIVE') {
           const canTrade = await this.funds.allocate(stake);
           if (!canTrade) {
               console.log("   ⚠️ SKIPPED: Low Funds");
               continue;
           }
           console.log(`   💵 Committing: $${stake.toFixed(2)}`);
           
           try {
               await this.kalshi.placeOrder({
                  ticker: opp.id,
                  action: 'buy',
                  side: opp.side.toLowerCase(),
                  count: Math.floor(stake / (opp.price || 0.50)),
                  type: 'market'
               });
               console.log("   ✅ LIVE ORDER SUBMITTED.");
               this.saveHistory(opp.id);
               liveCount++;
           } catch (err) {
               console.log("   ❌ LIVE FAIL:", err.message);
           }
       } else {
           console.log("   📝 [SIM] Candidate logged.");
           simCount++;
       }
    }

    console.log(`\n📊 REPORT: ${liveCount} Live Trades | ${simCount} Simulations`);
  }
}
