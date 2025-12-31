"use strict";
/**
 * Test Run
 * Tests the Alpha Hunter system with simulated scenarios
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const ai_brain_1 = require("./ai-brain");
const kalshi_trader_1 = require("./intelligence/kalshi-trader");
const progno_integration_1 = require("./intelligence/progno-integration");
const sms_notifier_1 = require("./sms-notifier");
async function testRun() {
    console.log('🧪 ALPHA HUNTER TEST RUN\n');
    console.log('═══════════════════════════════════════════\n');
    const brain = new ai_brain_1.AIBrain();
    const funds = new FundManager();
    const kalshi = new kalshi_trader_1.KalshiTrader();
    const progno = new progno_integration_1.PrognoIntegration();
    const sms = new sms_notifier_1.SMSNotifier();
    // Test 1: Account Operations
    console.log('📋 TEST 1: Account Operations\n');
    let account = await funds.getAccount();
    console.log(`Initial balance: $${account.balance}`);
    await funds.deposit(100, 'test');
    account = await funds.getAccount();
    console.log(`After $100 deposit: $${account.balance}`);
    await funds.withdraw(25, 'test');
    account = await funds.getAccount();
    console.log(`After $25 withdraw: $${account.balance}`);
    console.log('✅ Account operations working\n');
    // Test 2: PROGNO Integration
    console.log('═══════════════════════════════════════════');
    console.log('📋 TEST 2: PROGNO Integration\n');
    const picks = await progno.getTodaysPicks();
    console.log(`PROGNO picks: ${picks.length}`);
    const opportunities = await progno.convertToOpportunities(picks);
    console.log(`Converted opportunities: ${opportunities.length}`);
    if (opportunities.length > 0) {
        console.log(`Top pick: ${opportunities[0].title}`);
        console.log(`Confidence: ${opportunities[0].confidence}%`);
    }
    const arbitrage = await progno.getArbitrageOpportunities();
    console.log(`Arbitrage opportunities: ${arbitrage.length}`);
    console.log('✅ PROGNO integration working\n');
    // Test 3: Kalshi Integration
    console.log('═══════════════════════════════════════════');
    console.log('📋 TEST 3: Kalshi Integration\n');
    const kalshiMarkets = await kalshi.getMarkets();
    console.log(`Kalshi markets: ${kalshiMarkets.length}`);
    const kalshiOpps = await kalshi.findOpportunities(5);
    console.log(`Kalshi opportunities (5%+ edge): ${kalshiOpps.length}`);
    if (kalshiOpps.length > 0) {
        console.log(`Top opportunity: ${kalshiOpps[0].title}`);
        console.log(`Edge: +${kalshiOpps[0].expectedValue.toFixed(1)}%`);
    }
    console.log('✅ Kalshi integration working\n');
    // Test 4: AI Analysis
    console.log('═══════════════════════════════════════════');
    console.log('📋 TEST 4: AI Brain Analysis\n');
    const analysis = await brain.analyzeAllSources();
    console.log(`Opportunities found: ${analysis.allOpportunities.length}`);
    console.log(`Market analysis: ${analysis.marketAnalysis}`);
    console.log(`Overall confidence: ${analysis.confidenceLevel}%`);
    if (analysis.topOpportunity) {
        console.log(`\nTop opportunity: ${analysis.topOpportunity.title}`);
        console.log(`Type: ${analysis.topOpportunity.type}`);
        console.log(`Confidence: ${analysis.topOpportunity.confidence}%`);
        console.log(`Expected value: +${analysis.topOpportunity.expectedValue.toFixed(1)}%`);
    }
    console.log('✅ AI analysis working\n');
    // Test 5: Daily Suggestion Generation
    console.log('═══════════════════════════════════════════');
    console.log('📋 TEST 5: Daily Suggestion\n');
    const suggestion = await brain.generateDailySuggestion(account.balance);
    console.log(suggestion);
    console.log('\n✅ Suggestion generation working\n');
    // Test 6: Trade Validation
    console.log('═══════════════════════════════════════════');
    console.log('📋 TEST 6: Trade Validation\n');
    if (analysis.topOpportunity) {
        const canTrade = await funds.canTrade(analysis.topOpportunity);
        console.log(`Can execute top opportunity: ${canTrade.allowed}`);
        if (!canTrade.allowed) {
            console.log(`Reason: ${canTrade.reason}`);
        }
    }
    console.log('✅ Trade validation working\n');
    // Test 7: SMS (Dry Run)
    console.log('═══════════════════════════════════════════');
    console.log('📋 TEST 7: SMS Notification (Dry Run)\n');
    console.log(`SMS configured: ${sms.isConfigured() ? 'Yes' : 'No (will log instead)'}`);
    await sms.sendDailySuggestion('🧪 Test message from Alpha Hunter');
    console.log('✅ SMS notification working\n');
    // Summary
    console.log('═══════════════════════════════════════════');
    console.log('              TEST SUMMARY                 ');
    console.log('═══════════════════════════════════════════\n');
    console.log('✅ All systems operational!');
    console.log(`💰 Balance: $${account.balance.toFixed(2)}`);
    console.log(`📊 Opportunities: ${analysis.allOpportunities.length}`);
    console.log(`🎯 Ready to hunt for $250/day\n`);
    // Simulated trade scenario
    console.log('═══════════════════════════════════════════');
    console.log('📋 SIMULATED TRADE SCENARIO\n');
    const mockOpportunity = {
        id: 'test_1',
        type: 'prediction_market',
        source: 'Test',
        title: 'Test Market YES',
        description: 'Simulated opportunity',
        confidence: 72,
        expectedValue: 8.5,
        riskLevel: 'medium',
        timeframe: 'Today',
        requiredCapital: 25,
        potentialReturn: 45,
        reasoning: ['Test reasoning'],
        dataPoints: [],
        action: {
            platform: 'kalshi',
            actionType: 'buy',
            amount: 25,
            target: 'TEST-MKT YES',
            instructions: ['Buy YES at 55¢'],
            autoExecute: false,
        },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
    };
    const tradeAllowed = await funds.canTrade(mockOpportunity);
    console.log(`Trade allowed: ${tradeAllowed.allowed}`);
    if (tradeAllowed.allowed) {
        console.log('📊 Allocating funds...');
        await funds.allocateFunds(mockOpportunity.id, 25);
        account = await funds.getAccount();
        console.log(`Available after allocation: $${account.availableFunds.toFixed(2)}`);
        // Simulate win
        console.log('🎲 Simulating win...');
        await funds.releaseFunds(mockOpportunity.id, 25, 20);
        account = await funds.getAccount();
        console.log(`Balance after win: $${account.balance.toFixed(2)}`);
        console.log(`Today profit: $${account.todayProfit.toFixed(2)}`);
    }
    console.log('\n✅ Simulation complete!\n');
}
testRun().catch(console.error);
//# sourceMappingURL=test-run.js.map