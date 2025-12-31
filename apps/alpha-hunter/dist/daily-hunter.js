"use strict";
/**
 * Daily Hunter
 * Main entry point - runs daily to find and execute best opportunities
 * Goal: Make $250/day autonomously
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const ai_brain_1 = require("./ai-brain");
const kalshi_trader_1 = require("./intelligence/kalshi-trader");
const sms_notifier_1 = require("./sms-notifier");
class DailyHunter {
    constructor() {
        this.brain = new ai_brain_1.AIBrain();
        this.funds = new FundManager();
        this.kalshi = new kalshi_trader_1.KalshiTrader();
        this.sms = new sms_notifier_1.SMSNotifier();
        this.dailyTarget = parseFloat(process.env.DAILY_PROFIT_TARGET || '250');
        this.autoExecute = process.env.AUTO_EXECUTE === 'true';
    }
    async run() {
        console.log('╔════════════════════════════════════════════╗');
        console.log('║        🦅 ALPHA HUNTER - DAILY RUN         ║');
        console.log('║       Target: $' + this.dailyTarget.toString().padEnd(6) + ' | ' + new Date().toLocaleDateString().padEnd(14) + '║');
        console.log('╚════════════════════════════════════════════╝\n');
        try {
            // Step 1: Check account status
            const account = await this.funds.getAccount();
            console.log(`💰 Account Balance: $${account.balance.toFixed(2)}`);
            console.log(`📊 Available: $${account.availableFunds.toFixed(2)}`);
            console.log(`📈 Today's P&L: ${account.todayProfit >= 0 ? '+' : ''}$${account.todayProfit.toFixed(2)}\n`);
            if (account.availableFunds < 10) {
                const msg = '⚠️ Insufficient funds to trade. Please deposit more capital.';
                console.log(msg);
                await this.sms.sendAlert('Low Funds', msg);
                return;
            }
            // Check if already hit target
            if (account.todayProfit >= this.dailyTarget) {
                const msg = `🎉 Daily target of $${this.dailyTarget} already achieved! ($${account.todayProfit.toFixed(2)})\nResting until tomorrow.`;
                console.log(msg);
                await this.sms.sendAlert('Target Hit!', msg);
                return;
            }
            // Step 2: Analyze all opportunities
            console.log('🔍 Scanning for opportunities...\n');
            const analysis = await this.brain.analyzeAllSources();
            console.log(`\n📊 Market Analysis: ${analysis.marketAnalysis}`);
            console.log(`⚠️ Risk Assessment: ${analysis.riskAssessment}`);
            console.log(`🎯 Confidence: ${analysis.confidenceLevel}%\n`);
            if (!analysis.topOpportunity) {
                const msg = '⏳ No strong opportunities found today. Waiting for better setups.';
                console.log(msg);
                await this.sms.sendDailySuggestion(`🤖 ALPHA HUNTER\n${new Date().toLocaleDateString()}\n\n${msg}\n\n💰 Balance: $${account.balance.toFixed(2)}`);
                return;
            }
            // Step 3: Generate daily suggestion
            const suggestion = await this.brain.generateDailySuggestion(account.balance);
            console.log('\n' + suggestion);
            // Step 4: Send SMS with top opportunity
            await this.sms.sendDailySuggestion(suggestion);
            // Step 5: Execute trades if auto-execute is enabled
            if (this.autoExecute && analysis.topOpportunity.action.autoExecute) {
                console.log('\n🤖 AUTO-EXECUTE ENABLED - Processing top opportunity...');
                await this.executeOpportunity(analysis.topOpportunity);
            }
            else {
                console.log('\n⏸️ Auto-execute disabled. Review and trade manually.');
            }
            // Step 6: Process additional opportunities if we have room
            const openTrades = await this.funds.getOpenTrades();
            const maxPositions = parseInt(process.env.MAX_OPEN_POSITIONS || '5');
            if (this.autoExecute && openTrades.length < maxPositions) {
                const additionalOpps = analysis.allOpportunities
                    .slice(1, maxPositions - openTrades.length + 1)
                    .filter(opp => opp.confidence >= 70 &&
                    opp.action.autoExecute &&
                    opp.type !== analysis.topOpportunity.type // Diversify
                );
                for (const opp of additionalOpps) {
                    const canTrade = await this.funds.canTrade(opp);
                    if (canTrade.allowed) {
                        console.log(`\n📈 Executing additional opportunity: ${opp.title}`);
                        await this.executeOpportunity(opp);
                    }
                }
            }
            // Step 7: Print summary
            await this.printDaySummary();
        }
        catch (error) {
            console.error('❌ Daily run error:', error);
            await this.sms.sendAlert('Error', `Alpha Hunter error: ${error}`);
        }
    }
    async executeOpportunity(opp) {
        // Validate we can trade
        const canTrade = await this.funds.canTrade(opp);
        if (!canTrade.allowed) {
            console.log(`⚠️ Cannot trade: ${canTrade.reason}`);
            return null;
        }
        console.log(`\n🎯 Executing: ${opp.title}`);
        console.log(`💵 Amount: $${opp.requiredCapital}`);
        console.log(`📊 Confidence: ${opp.confidence}%`);
        // Allocate funds
        await this.funds.allocateFunds(opp.id, opp.requiredCapital);
        let trade = null;
        // Execute based on platform
        switch (opp.action.platform) {
            case 'kalshi':
                const parts = opp.action.target.split(' ');
                const marketId = parts[0];
                const side = parts[1]?.toLowerCase() || 'yes';
                const price = opp.type === 'prediction_market' ? 50 : 100; // Default max price
                trade = await this.kalshi.placeBet(marketId, side, opp.requiredCapital, price);
                break;
            case 'manual':
                console.log('📝 Manual execution required:');
                opp.action.instructions.forEach((inst, i) => console.log(`   ${i + 1}. ${inst}`));
                // Create tracking record
                trade = {
                    id: `manual_${Date.now()}`,
                    opportunityId: opp.id,
                    type: opp.type,
                    platform: 'manual',
                    amount: opp.requiredCapital,
                    target: opp.title,
                    status: 'pending',
                    profit: 0,
                    reasoning: opp.reasoning.join('; '),
                    executedAt: new Date().toISOString(),
                };
                break;
            default:
                console.log(`⚠️ Unknown platform: ${opp.action.platform}`);
                return null;
        }
        if (trade) {
            await this.funds.recordTrade(trade);
            await this.sms.sendTradeExecuted(opp.title, opp.requiredCapital, opp.action.platform);
            console.log(`✅ Trade recorded: ${trade.id}`);
        }
        return trade;
    }
    async printDaySummary() {
        const account = await this.funds.getAccount();
        const stats = await this.funds.getPerformanceStats();
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║              📊 DAY SUMMARY                 ║');
        console.log('╠════════════════════════════════════════════╣');
        console.log(`║  Balance:      $${account.balance.toFixed(2).padEnd(23)}║`);
        console.log(`║  Today P&L:    ${account.todayProfit >= 0 ? '+' : ''}$${account.todayProfit.toFixed(2).padEnd(22)}║`);
        console.log(`║  Target:       $${this.dailyTarget.toFixed(2).padEnd(23)}║`);
        console.log(`║  Progress:     ${Math.min(100, (account.todayProfit / this.dailyTarget * 100)).toFixed(1)}%`.padEnd(42) + '║');
        console.log('╠════════════════════════════════════════════╣');
        console.log(`║  Total Trades: ${stats.totalTrades}`.padEnd(42) + '║');
        console.log(`║  Win Rate:     ${stats.winRate.toFixed(1)}%`.padEnd(42) + '║');
        console.log(`║  All-time P&L: ${stats.totalProfit >= 0 ? '+' : ''}$${stats.totalProfit.toFixed(2)}`.padEnd(42) + '║');
        console.log('╚════════════════════════════════════════════╝');
    }
    async settleTrades() {
        console.log('\n🔄 Checking for trades to settle...');
        const openTrades = await this.funds.getOpenTrades();
        console.log(`📊 Open trades: ${openTrades.length}`);
        for (const trade of openTrades) {
            // Check if trade has settled
            // In production, this would query the platform API
            // For now, we'll simulate settlements
            if (trade.platform === 'kalshi') {
                // Check Kalshi positions
                const positions = await this.kalshi.getPositions();
                const position = positions.find(p => p.marketId === trade.target.split(' ')[0]);
                if (position && position.pnl !== 0) {
                    const profit = position.pnl;
                    const isWin = profit > 0;
                    await this.funds.updateTrade(trade.id, {
                        status: isWin ? 'won' : 'lost',
                        profit,
                        settledAt: new Date().toISOString(),
                    });
                    await this.funds.releaseFunds(trade.opportunityId, trade.amount, profit);
                    await this.sms.sendTradeResult(trade.target, profit, isWin);
                    // Record learning
                    this.brain.recordOutcome({
                        opportunityType: trade.type,
                        confidence: 70, // Would need to store this
                        outcome: isWin ? 'success' : 'failure',
                        actualReturn: profit,
                        expectedReturn: 10, // Would need to store this
                        factors: [],
                        timestamp: new Date().toISOString(),
                    });
                    console.log(`${isWin ? '✅' : '❌'} Settled: ${trade.target} | ${isWin ? '+' : ''}$${profit.toFixed(2)}`);
                }
            }
        }
    }
}
// Main execution
const hunter = new DailyHunter();
// Parse command line args
const args = process.argv.slice(2);
if (args.includes('--settle')) {
    hunter.settleTrades().then(() => process.exit(0));
}
else {
    hunter.run().then(() => process.exit(0));
}
//# sourceMappingURL=daily-hunter.js.map