"use strict";
/**
 * Kalshi Autonomous Trader
 * AI-powered prediction market trading using PROGNO + Massager data
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KalshiAutonomousTrader = void 0;
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const url_1 = require("url");
const __dirname = path.dirname((0, url_1.fileURLToPath)(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const kalshi_trader_1 = require("./intelligence/kalshi-trader");
const progno_integration_1 = require("./intelligence/progno-integration");
const fund_manager_1 = require("./fund-manager");
const data_aggregator_1 = require("./intelligence/data-aggregator");
class KalshiAutonomousTrader {
    constructor() {
        this.bets = [];
        this.isRunning = false;
        // Trading parameters
        this.maxBetSize = 10; // $10 max per bet
        this.minConfidence = 70; // Only bet if 70%+ confident
        this.maxOpenBets = 5; // Max concurrent bets
        this.minEdge = 8; // Minimum 8% edge required
        this.kalshi = new kalshi_trader_1.KalshiTrader();
        this.progno = new progno_integration_1.PrognoIntegration();
        this.claude = process.env.ANTHROPIC_API_KEY
            ? new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY })
            : null;
        this.learning = {
            totalBets: 0,
            wins: 0,
            losses: 0,
            totalPnL: 0,
            bestBet: null,
            worstBet: null,
            categoryPerformance: {}
        };
    }
    async initialize() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║       🎯 KALSHI AUTONOMOUS PREDICTION TRADER 🎯              ║
║                                                              ║
║  AI-Powered • PROGNO Data • Auto-Trading Prediction Markets  ║
╚══════════════════════════════════════════════════════════════╝
    `);
        // Check configuration
        const balance = await this.kalshi.getBalance();
        const isDemo = !process.env.KALSHI_API_KEY_ID;
        console.log(`💰 Kalshi Balance: $${balance.toFixed(2)} ${isDemo ? '(DEMO MODE)' : ''}`);
        console.log(`🧠 AI Brain: ${this.claude ? '✅ Claude connected' : '⚠️ No AI'}`);
        console.log(`📊 PROGNO: ✅ Connected`);
        console.log('');
    }
    async getPrognoIntelligence() {
        try {
            const [picks, arbitrage] = await Promise.all([
                this.progno.getTodaysPicks(),
                this.progno.getArbitrageOpportunities(),
            ]);
            let intel = '📊 PROGNO INTELLIGENCE:\n';
            if (picks.length > 0) {
                intel += `Sports Picks: ${picks.length} available\n`;
                picks.slice(0, 3).forEach(p => {
                    intel += `  - ${p.league}: ${p.pick} (${p.confidence}% conf)\n`;
                });
            }
            if (arbitrage.length > 0) {
                intel += `Arbitrage Opps: ${arbitrage.length} found\n`;
            }
            return intel;
        }
        catch {
            return 'PROGNO: Offline';
        }
    }
    async getMarketIntelligence() {
        // Get current market conditions
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        let intel = '📈 MARKET CONDITIONS:\n';
        // Time-based context
        if (hour >= 9 && hour <= 16 && dayOfWeek >= 1 && dayOfWeek <= 5) {
            intel += '  - US Markets: OPEN (higher liquidity)\n';
        }
        else {
            intel += '  - US Markets: CLOSED\n';
        }
        // Day context
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            intel += '  - Weekend: Sports markets active\n';
        }
        // Get enhanced data from aggregator
        try {
            const fullData = await data_aggregator_1.dataAggregator.getFullBriefing();
            intel += `  - Fear & Greed: ${fullData.market.fearGreedIndex.value} (${fullData.market.fearGreedIndex.classification})\n`;
            intel += `  - Trading Bias: ${fullData.tradingBias.toUpperCase()} (${fullData.confidence}% conf)\n`;
            if (fullData.news.majorEvents.length > 0) {
                intel += `  - ⚠️ Major Event: ${fullData.news.majorEvents[0].substring(0, 50)}...\n`;
            }
        }
        catch {
            intel += '  - Enhanced data: unavailable\n';
        }
        return intel;
    }
    async analyzeMarket(market) {
        if (!this.claude) {
            // Fallback without AI
            const edge = market.edge || 0;
            return {
                shouldBet: edge >= this.minEdge,
                side: market.yesPrice < 50 ? 'yes' : 'no',
                confidence: 50 + edge,
                reasoning: `Edge: ${edge}%`,
                suggestedAmount: 5
            };
        }
        const prognoIntel = await this.getPrognoIntelligence();
        const marketIntel = await this.getMarketIntelligence();
        // Get win rate for this category
        const categoryStats = this.learning.categoryPerformance[market.category] || { wins: 0, losses: 0 };
        const categoryWinRate = categoryStats.wins + categoryStats.losses > 0
            ? (categoryStats.wins / (categoryStats.wins + categoryStats.losses) * 100).toFixed(1)
            : 'N/A';
        try {
            const response = await this.claude.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 400,
                messages: [{
                        role: 'user',
                        content: `You are a prediction market expert. Analyze this Kalshi market:

═══════════════════════════════════════
MARKET: ${market.title}
Category: ${market.category}
YES Price: ${market.yesPrice}¢ | NO Price: ${market.noPrice}¢
Volume: $${market.volume?.toLocaleString() || 'N/A'}
Expires: ${market.expiresAt}
═══════════════════════════════════════

${prognoIntel}

${marketIntel}

MY LEARNING HISTORY:
- Total bets: ${this.learning.totalBets}
- Win rate: ${this.learning.totalBets > 0 ? (this.learning.wins / this.learning.totalBets * 100).toFixed(1) : 0}%
- ${market.category} win rate: ${categoryWinRate}%
- Total P&L: $${this.learning.totalPnL.toFixed(2)}

RULES:
- Max bet: $${this.maxBetSize}
- Min confidence: ${this.minConfidence}%
- Min edge required: ${this.minEdge}%
- I need real edge, not coin flips

Should I bet? Respond with JSON only:
{
  "shouldBet": true/false,
  "side": "yes" or "no",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "suggestedAmount": 5-10
}`
                    }]
            });
            const text = response.content[0].type === 'text' ? response.content[0].text : '';
            const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
            return {
                shouldBet: json.shouldBet || false,
                side: json.side || 'yes',
                confidence: json.confidence || 50,
                reasoning: json.reasoning || 'AI analysis',
                suggestedAmount: Math.min(json.suggestedAmount || 5, this.maxBetSize)
            };
        }
        catch (err) {
            console.log(`   ⚠️ AI analysis failed: ${err.message.substring(0, 50)}`);
            return {
                shouldBet: false,
                side: 'yes',
                confidence: 0,
                reasoning: 'AI offline',
                suggestedAmount: 0
            };
        }
    }
    async placeBet(market, side, amount, confidence, reasoning) {
        const price = side === 'yes' ? market.yesPrice : market.noPrice;
        const contracts = Math.floor(amount / price * 100);
        console.log(`\n🎯 Placing ${side.toUpperCase()} bet on: ${market.title}`);
        console.log(`   Amount: $${amount} (${contracts} contracts @ ${price}¢)`);
        console.log(`   Confidence: ${confidence}%`);
        console.log(`   Reasoning: ${reasoning}`);
        const trade = await this.kalshi.placeBet(market.id, side, amount, price);
        if (trade) {
            const bet = {
                id: trade.id,
                marketId: market.id,
                marketTitle: market.title,
                side,
                contracts,
                entryPrice: price,
                amount,
                aiConfidence: confidence,
                aiReasoning: reasoning,
                timestamp: new Date(),
                status: 'open'
            };
            this.bets.push(bet);
            console.log(`   ✅ Bet placed! ID: ${trade.id}`);
            return bet;
        }
        console.log(`   ❌ Bet failed`);
        return null;
    }
    async checkOpenBets() {
        const openBets = this.bets.filter(b => b.status === 'open');
        if (openBets.length === 0)
            return;
        console.log(`\n📋 OPEN BETS (${openBets.length}):`);
        // In production, we'd check Kalshi API for position updates
        // For now, just display them
        for (const bet of openBets) {
            console.log(`   🎯 ${bet.side.toUpperCase()}: ${bet.marketTitle.substring(0, 50)}...`);
            console.log(`      Entry: ${bet.entryPrice}¢ | Amount: $${bet.amount} | Conf: ${bet.aiConfidence}%`);
        }
    }
    async runCycle() {
        console.log('\n🔄 Starting Kalshi scan...\n');
        // Get current balance and update fund manager
        const balance = await this.kalshi.getBalance();
        const inPositions = this.bets.filter(b => b.status === 'open').reduce((sum, b) => sum + b.amount, 0);
        fund_manager_1.fundManager.updateKalshiBalance(balance - inPositions, inPositions);
        // Show unified fund status
        console.log(fund_manager_1.fundManager.getStatus());
        console.log(`\n💰 Kalshi Available: $${(balance - inPositions).toFixed(2)}`);
        // Check open bets
        await this.checkOpenBets();
        const openBets = this.bets.filter(b => b.status === 'open').length;
        if (openBets >= this.maxOpenBets) {
            console.log(`\n⚠️ Max open bets reached (${openBets}/${this.maxOpenBets}). Waiting...`);
            return;
        }
        // Find opportunities
        console.log('\n🔍 Scanning markets for opportunities...');
        const opportunities = await this.kalshi.findOpportunities(this.minEdge);
        console.log(`   Found ${opportunities.length} potential opportunities`);
        // Analyze top opportunities with AI
        const marketsToAnalyze = opportunities.slice(0, 5);
        for (const opp of marketsToAnalyze) {
            // Extract market info from opportunity
            const market = {
                id: opp.action.target.split(' ')[0],
                title: opp.title.replace('YES: ', '').replace('NO: ', ''),
                category: opp.type,
                yesPrice: 50, // Would come from actual market data
                noPrice: 50,
                volume: 0,
                expiresAt: opp.expiresAt,
                edge: opp.expectedValue
            };
            console.log(`\n📊 Analyzing: ${market.title.substring(0, 60)}...`);
            const analysis = await this.analyzeMarket(market);
            console.log(`   AI Decision: ${analysis.shouldBet ? '✅ BET' : '❌ PASS'}`);
            console.log(`   Side: ${analysis.side.toUpperCase()} | Confidence: ${analysis.confidence}%`);
            console.log(`   Reasoning: ${analysis.reasoning}`);
            if (analysis.shouldBet && analysis.confidence >= this.minConfidence) {
                // Check with fund manager if we should trade on Kalshi
                if (!fund_manager_1.fundManager.shouldTradeOnPlatform('kalshi', analysis.confidence)) {
                    console.log(`   ⚠️ Fund manager: Kalshi over-allocated, skipping...`);
                    continue;
                }
                // Get max allowed from fund manager
                const maxFromFunds = fund_manager_1.fundManager.getMaxTradeAmount('kalshi', this.maxBetSize);
                const betAmount = Math.min(analysis.suggestedAmount, maxFromFunds);
                if (betAmount < 5) {
                    console.log(`   ⚠️ Insufficient funds allocated to Kalshi ($${betAmount})`);
                    continue;
                }
                await this.placeBet(market, analysis.side, betAmount, analysis.confidence, analysis.reasoning);
                break; // One bet per cycle
            }
        }
        // Show learning stats
        await this.showStats();
    }
    async showStats() {
        const winRate = this.learning.totalBets > 0;
        // Sync cumulative stats to fund manager
        const currentPnL = this.learning.totalPnL;
        const currentTrades = this.learning.totalBets;
        const currentWins = this.learning.wins;
        const currentLosses = this.learning.losses;
        // Calculate P&L delta (only update if changed)
        const kalshiStats = fund_manager_1.fundManager.getKalshiStats();
        const pnlDelta = currentPnL - kalshiStats.pnl;
        if (Math.abs(pnlDelta) > 0.01) {
            fund_manager_1.fundManager.updateKalshiStats(pnlDelta, pnlDelta > 0);
        }
        // Update fund manager with cumulative stats 
        const balance = await this.kalshi.getBalance();
        const inPositions = this.bets.filter(b => b.status === 'open').reduce((sum, b) => sum + b.amount, 0);
        fund_manager_1.fundManager.updateKalshiBalance(balance - inPositions, inPositions, 0);
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                📊 KALSHI LEARNING PROGRESS 📊                ║
╠══════════════════════════════════════════════════════════════╣
║  Total Bets:    ${String(this.learning.totalBets).padEnd(10)}                             ║
║  Wins:          ${String(this.learning.wins).padEnd(10)} Losses: ${String(this.learning.losses).padEnd(10)}      ║
║  Win Rate:      ${(winRate + '%').padEnd(10)}                             ║
║  Total P&L:     ${(this.learning.totalPnL >= 0 ? '+' : '') + '$' + this.learning.totalPnL.toFixed(2)}                                   ║
║  Open Bets:     ${String(this.bets.filter(b => b.status === 'open').length).padEnd(10)}                             ║
╚══════════════════════════════════════════════════════════════╝
    `);
    }
    async startTrading(intervalMinutes = 5) {
        console.log(`\n🚀 Starting Kalshi autonomous trading (every ${intervalMinutes} min)...`);
        console.log('   Press Ctrl+C to stop\n');
        this.isRunning = true;
        // Handle shutdown
        process.on('SIGINT', async () => {
            console.log('\n\n🛑 Stopping Kalshi trader...');
            this.isRunning = false;
            await this.showStats();
            console.log('\n👋 Kalshi trading session ended.\n');
            process.exit(0);
        });
        // Run loop
        while (this.isRunning) {
            await this.runCycle();
            console.log(`\n⏳ Next scan in ${intervalMinutes} minutes...`);
            // Wait with countdown
            for (let i = intervalMinutes * 60; i > 0 && this.isRunning; i -= 30) {
                await new Promise(r => setTimeout(r, 30000));
                if (i > 30)
                    console.log(`   ${Math.floor(i / 60)}m ${i % 60}s...`);
            }
        }
    }
}
exports.KalshiAutonomousTrader = KalshiAutonomousTrader;
// Main
async function main() {
    console.log('\n🎯 KALSHI AUTONOMOUS TRADER STARTING...\n');
    const trader = new KalshiAutonomousTrader();
    await trader.initialize();
    await trader.startTrading(5); // Scan every 5 minutes
}
main().catch(console.error);
//# sourceMappingURL=kalshi-trainer.js.map