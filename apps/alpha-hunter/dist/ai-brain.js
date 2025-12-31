"use strict";
/**
 * AI Brain
 * The core intelligence that analyzes all data sources and makes decisions
 * Uses Claude for reasoning, integrates PROGNO Massager for calculations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIBrain = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const news_scanner_1 = require("./intelligence/news-scanner");
const progno_integration_1 = require("./intelligence/progno-integration");
const kalshi_trader_1 = require("./intelligence/kalshi-trader");
const crypto_trader_1 = require("./strategies/crypto-trader");
class AIBrain {
    constructor() {
        this.learningHistory = [];
        const apiKey = process.env.ANTHROPIC_API_KEY;
        this.anthropic = apiKey ? new sdk_1.default({ apiKey }) : null;
        this.newsScanner = new news_scanner_1.NewsScanner();
        this.progno = new progno_integration_1.PrognoIntegration();
        this.kalshi = new kalshi_trader_1.KalshiTrader();
        this.cryptoTrader = new crypto_trader_1.CryptoTrader();
        this.config = {
            dailyProfitTarget: parseFloat(process.env.DAILY_PROFIT_TARGET || '250'),
            maxDailyRisk: parseFloat(process.env.MAX_DAILY_LOSS || '100'),
            maxTradeSize: parseFloat(process.env.MAX_SINGLE_TRADE || '50'),
            minConfidence: parseFloat(process.env.MIN_CONFIDENCE || '65'),
            minExpectedValue: parseFloat(process.env.MIN_EXPECTED_VALUE || '5'),
            autoExecute: process.env.AUTO_EXECUTE === 'true',
            preferredPlatforms: (process.env.PREFERRED_PLATFORMS || 'kalshi,progno').split(','),
            smsEnabled: process.env.SMS_ENABLED === 'true',
            phoneNumber: process.env.MY_PERSONAL_NUMBER || '',
        };
    }
    async analyzeAllSources() {
        console.log('🧠 AI Brain analyzing all sources...\n');
        // Gather data from all sources in parallel
        const [news, prognoPicks, kalshiOpps, arbitrageOpps, cryptoOpps] = await Promise.all([
            this.newsScanner.scanAllSources(),
            this.progno.getTodaysPicks().then(picks => this.progno.convertToOpportunities(picks)),
            this.kalshi.findOpportunities(5),
            this.progno.getArbitrageOpportunities(),
            this.cryptoTrader.getOpportunities(),
        ]);
        console.log(`📰 Found ${news.length} relevant news items`);
        console.log(`🎯 Found ${prognoPicks.length} PROGNO picks`);
        console.log(`📊 Found ${kalshiOpps.length} Kalshi opportunities`);
        console.log(`💰 Found ${arbitrageOpps.length} arbitrage opportunities`);
        console.log(`🪙 Found ${cryptoOpps.length} crypto opportunities`);
        // Combine all opportunities
        const allOpportunities = [
            ...arbitrageOpps, // Arbitrage first (lowest risk)
            ...prognoPicks,
            ...kalshiOpps,
            ...cryptoOpps, // Crypto trades from exchanges
        ].filter(opp => opp.confidence >= this.config.minConfidence &&
            opp.expectedValue >= this.config.minExpectedValue);
        // Use AI to rank and analyze opportunities
        const analysis = await this.rankOpportunities(allOpportunities, news);
        return analysis;
    }
    async rankOpportunities(opportunities, news) {
        if (opportunities.length === 0) {
            return {
                topOpportunity: null,
                allOpportunities: [],
                marketAnalysis: 'No opportunities meeting criteria found today.',
                riskAssessment: 'N/A',
                recommendedAction: 'Wait for better opportunities.',
                confidenceLevel: 0,
            };
        }
        // If Claude is available, use AI reasoning
        if (this.anthropic) {
            try {
                const analysis = await this.getClaudeAnalysis(opportunities, news);
                return analysis;
            }
            catch (error) {
                console.error('Claude analysis error:', error);
            }
        }
        // Fallback to algorithmic ranking
        return this.algorithmicRanking(opportunities, news);
    }
    async getClaudeAnalysis(opportunities, news) {
        const prompt = `You are Alpha Hunter, an expert AI trading bot. Analyze these opportunities and recommend the best one for making $${this.config.dailyProfitTarget} today.

OPPORTUNITIES:
${JSON.stringify(opportunities.slice(0, 10), null, 2)}

RELEVANT NEWS:
${news.slice(0, 5).map(n => `- ${n.title}: ${n.summary}`).join('\n')}

CONSTRAINTS:
- Max single trade: $${this.config.maxTradeSize}
- Min confidence: ${this.config.minConfidence}%
- Daily profit target: $${this.config.dailyProfitTarget}
- Risk tolerance: Conservative to Medium

LEARNING HISTORY (recent outcomes):
${this.learningHistory.slice(-10).map(l => `- ${l.opportunityType}: ${l.outcome} (expected ${l.expectedReturn}%, got ${l.actualReturn}%)`).join('\n') || 'No history yet'}

Analyze and provide:
1. BEST_OPPORTUNITY_INDEX: (number, 0-based index of best opportunity)
2. MARKET_ANALYSIS: (brief market conditions analysis)
3. RISK_ASSESSMENT: (risk level and reasoning)
4. RECOMMENDED_ACTION: (specific action to take)
5. CONFIDENCE: (0-100, your confidence in this recommendation)
6. REASONING: (why this is the best choice)

Respond in JSON format.`;
        const response = await this.anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }],
        });
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        try {
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                throw new Error('No JSON found');
            const analysis = JSON.parse(jsonMatch[0]);
            const bestIndex = analysis.BEST_OPPORTUNITY_INDEX || 0;
            return {
                topOpportunity: opportunities[bestIndex] || opportunities[0],
                allOpportunities: opportunities,
                marketAnalysis: analysis.MARKET_ANALYSIS || 'Market conditions analyzed.',
                riskAssessment: analysis.RISK_ASSESSMENT || 'Medium risk.',
                recommendedAction: analysis.RECOMMENDED_ACTION || 'Proceed with caution.',
                confidenceLevel: analysis.CONFIDENCE || 70,
            };
        }
        catch (error) {
            console.error('Error parsing Claude response:', error);
            return this.algorithmicRanking(opportunities, news);
        }
    }
    algorithmicRanking(opportunities, news) {
        // Score each opportunity
        const scored = opportunities.map(opp => {
            let score = 0;
            // Base score from confidence and expected value
            score += opp.confidence * 0.4;
            score += Math.min(opp.expectedValue * 3, 30);
            // Bonus for low risk
            if (opp.riskLevel === 'low')
                score += 20;
            else if (opp.riskLevel === 'medium')
                score += 10;
            // Bonus for arbitrage (guaranteed profit)
            if (opp.type === 'arbitrage')
                score += 25;
            // Bonus for news correlation
            const newsBoost = news.some(n => opp.title.toLowerCase().includes(n.title.split(' ')[0].toLowerCase()));
            if (newsBoost)
                score += 10;
            // Adjust based on learning history
            const relevantLearning = this.learningHistory.filter(l => l.opportunityType === opp.type);
            if (relevantLearning.length > 0) {
                const successRate = relevantLearning.filter(l => l.outcome === 'success').length / relevantLearning.length;
                score *= (0.5 + successRate);
            }
            return { ...opp, score };
        });
        // Sort by score
        scored.sort((a, b) => b.score - a.score);
        const top = scored[0];
        return {
            topOpportunity: top,
            allOpportunities: scored,
            marketAnalysis: this.generateMarketAnalysis(news),
            riskAssessment: top.riskLevel === 'low'
                ? 'Low risk opportunity identified'
                : 'Medium risk - proceed with sized position',
            recommendedAction: this.generateAction(top),
            confidenceLevel: top.confidence,
        };
    }
    generateMarketAnalysis(news) {
        const bullish = news.filter(n => n.sentiment === 'bullish').length;
        const bearish = news.filter(n => n.sentiment === 'bearish').length;
        if (bullish > bearish * 2) {
            return 'Market sentiment strongly positive. Good conditions for directional plays.';
        }
        else if (bearish > bullish * 2) {
            return 'Market sentiment negative. Consider contrarian plays or wait.';
        }
        return 'Mixed market sentiment. Focus on edge-based opportunities.';
    }
    generateAction(opp) {
        if (opp.type === 'arbitrage') {
            return `Execute arbitrage play immediately. ${opp.action.instructions.join(' ')}`;
        }
        if (opp.type === 'prediction_market') {
            return `Place ${opp.action.actionType} order on Kalshi: ${opp.action.target}`;
        }
        if (opp.type === 'sports_bet') {
            return `Best PROGNO pick: ${opp.title}. Recommended stake: $${opp.requiredCapital}`;
        }
        return `Review opportunity: ${opp.title}`;
    }
    async generateDailyReport(analysis, tradesExecuted, profit) {
        const news = await this.newsScanner.scanAllSources();
        return {
            date: new Date().toISOString().split('T')[0],
            opportunitiesFound: analysis.allOpportunities.length,
            opportunitiesTaken: tradesExecuted,
            tradesExecuted,
            winRate: 0, // Will be calculated from actual results
            totalProfit: profit,
            bestOpportunity: analysis.topOpportunity,
            topRecommendation: analysis.topOpportunity,
            marketConditions: analysis.marketAnalysis,
            newsImpact: news.slice(0, 3).map(n => n.title),
            learnings: this.generateLearnings(),
        };
    }
    generateLearnings() {
        const learnings = [];
        // Analyze recent history
        const recentOutcomes = this.learningHistory.slice(-20);
        if (recentOutcomes.length === 0) {
            return ['Building initial learning dataset...'];
        }
        // Calculate success rate by type
        const byType = {};
        for (const outcome of recentOutcomes) {
            if (!byType[outcome.opportunityType]) {
                byType[outcome.opportunityType] = { wins: 0, total: 0 };
            }
            byType[outcome.opportunityType].total++;
            if (outcome.outcome === 'success') {
                byType[outcome.opportunityType].wins++;
            }
        }
        for (const [type, stats] of Object.entries(byType)) {
            const rate = (stats.wins / stats.total * 100).toFixed(1);
            if (stats.wins / stats.total > 0.6) {
                learnings.push(`${type} performing well (${rate}% win rate)`);
            }
            else if (stats.wins / stats.total < 0.4) {
                learnings.push(`Reduce ${type} exposure (${rate}% win rate)`);
            }
        }
        // Check for confidence calibration
        const overconfident = recentOutcomes.filter(l => l.confidence > 70 && l.outcome === 'failure').length;
        if (overconfident > 3) {
            learnings.push('Recalibrate confidence thresholds - too many high-confidence losses');
        }
        return learnings;
    }
    async generateDailySuggestion(balance) {
        const analysis = await this.analyzeAllSources();
        const stats = await this.getHistoricalPerformance();
        let suggestion = `🤖 ALPHA HUNTER DAILY BRIEF\n`;
        suggestion += `📅 ${new Date().toLocaleDateString()}\n`;
        suggestion += `💰 Balance: $${balance.toFixed(2)}\n\n`;
        if (!analysis.topOpportunity) {
            suggestion += `⏳ No high-confidence opportunities today.\n`;
            suggestion += `💡 Recommendation: Hold and wait for better setups.\n`;
            return suggestion;
        }
        const opp = analysis.topOpportunity;
        suggestion += `🎯 TOP OPPORTUNITY:\n`;
        suggestion += `${opp.title}\n`;
        suggestion += `📊 Confidence: ${opp.confidence}%\n`;
        suggestion += `📈 Expected Value: +${opp.expectedValue.toFixed(1)}%\n`;
        suggestion += `⚠️ Risk Level: ${opp.riskLevel}\n`;
        suggestion += `💵 Suggested Stake: $${opp.requiredCapital}\n`;
        suggestion += `🎲 Potential Return: $${opp.potentialReturn.toFixed(2)}\n\n`;
        suggestion += `📋 ACTION:\n`;
        suggestion += opp.action.instructions.join('\n') + '\n\n';
        suggestion += `📊 REASONING:\n`;
        suggestion += opp.reasoning.slice(0, 3).map(r => `• ${r}`).join('\n') + '\n\n';
        if (stats.totalTrades > 0) {
            suggestion += `📈 BOT PERFORMANCE:\n`;
            suggestion += `• Win Rate: ${stats.winRate.toFixed(1)}%\n`;
            suggestion += `• Total Profit: $${stats.totalProfit.toFixed(2)}\n`;
            suggestion += `• Best Trade: +$${stats.bestTrade.toFixed(2)}\n`;
        }
        suggestion += `\n🔥 LET'S GET THAT $250!`;
        return suggestion;
    }
    async getHistoricalPerformance() {
        // This would pull from database in production
        return {
            totalTrades: this.learningHistory.length,
            winRate: this.learningHistory.filter(l => l.outcome === 'success').length /
                Math.max(1, this.learningHistory.length) * 100,
            totalProfit: this.learningHistory.reduce((sum, l) => sum + l.actualReturn, 0),
            bestTrade: Math.max(0, ...this.learningHistory.map(l => l.actualReturn)),
        };
    }
    recordOutcome(learning) {
        this.learningHistory.push(learning);
        // Keep last 100 outcomes
        if (this.learningHistory.length > 100) {
            this.learningHistory.shift();
        }
    }
}
exports.AIBrain = AIBrain;
//# sourceMappingURL=ai-brain.js.map