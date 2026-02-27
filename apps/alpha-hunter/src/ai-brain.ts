/**
 * AI Brain
 * The core intelligence that analyzes all data sources and makes decisions
 * Uses Ollama local AI for reasoning, integrates PROGNO Massager for calculations
 */
import { Opportunity, DataPoint, DailyReport, NewsItem, BotConfig, LearningData } from './types';
import { localAI } from './lib/local-ai';
import { NewsScanner } from './intelligence/news-scanner';
import { PrognoIntegration } from './intelligence/progno-integration';
import { KalshiTrader } from './intelligence/kalshi-trader';
import { CryptoTrader } from './strategies/crypto-trader';

interface AnalysisResult {
  topOpportunity: Opportunity | null;
  allOpportunities: Opportunity[];
  marketAnalysis: string;
  riskAssessment: string;
  recommendedAction: string;
  confidenceLevel: number;
}

export class AIBrain {
  private newsScanner: NewsScanner;
  private progno: PrognoIntegration;
  private kalshi: KalshiTrader;
  private cryptoTrader: CryptoTrader;
  private config: BotConfig;
  private learningHistory: LearningData[] = [];

  constructor() {
    this.newsScanner = new NewsScanner();
    this.progno = new PrognoIntegration();
    this.kalshi = new KalshiTrader();
    this.cryptoTrader = new CryptoTrader();

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

  async analyzeAllSources(): Promise<AnalysisResult> {
    // Sports-only mode: set PROGNO_SPORTS_ONLY=1 to disable news/Kalshi/crypto/arb sources
    const sportsOnly = process.env.PROGNO_SPORTS_ONLY === '1';

    if (sportsOnly) {
      console.log('🧠 AI Brain (sports only) — fetching Progno picks...\n');
      const picks = await this.progno.getTodaysPicks();
      const prognoOpps = await this.progno.convertToOpportunities(picks);
      console.log(`🎯 Found ${prognoOpps.length} PROGNO sports picks`);
      const allOpportunities = prognoOpps.filter(
        (opp: Opportunity) => opp.confidence >= this.config.minConfidence && opp.expectedValue >= this.config.minExpectedValue
      );
      return this.rankOpportunities(allOpportunities, []);
    }

    console.log('🧠 AI Brain analyzing all sources...\n');
    const [news, prognoPicks, kalshiOpps, arbitrageOpps, cryptoOpps] = await Promise.all([
      this.newsScanner.scanAllSources(),
      this.progno.getTodaysPicks().then(p => this.progno.convertToOpportunities(p)),
      this.kalshi.findOpportunities(5),
      this.progno.getArbitrageOpportunities(),
      this.cryptoTrader.getOpportunities(),
    ]);
    console.log(`📰 News: ${news.length} | 🎯 Progno: ${prognoPicks.length} | 📊 Kalshi: ${kalshiOpps.length} | 💰 Arb: ${arbitrageOpps.length} | 🪙 Crypto: ${cryptoOpps.length}`);
    const allOpportunities = [
      ...arbitrageOpps,
      ...prognoPicks,
      ...kalshiOpps,
      ...cryptoOpps,
    ].filter(opp => opp.confidence >= this.config.minConfidence && opp.expectedValue >= this.config.minExpectedValue);
    return this.rankOpportunities(allOpportunities, news);
  }

  private async rankOpportunities(
    opportunities: Opportunity[],
    news: NewsItem[]
  ): Promise<AnalysisResult> {
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

    // Use local Ollama AI (free, no API key needed)
    if (localAI.isEnabled() && await localAI.isAvailable()) {
      try {
        const analysis = await this.getOllamaAnalysis(opportunities, news);
        if (analysis) return analysis;
      } catch (error) {
        console.warn('[AI Brain] Ollama analysis failed, using algorithmic fallback:', (error as Error).message);
      }
    }

    // Fallback to algorithmic ranking (no external API needed)
    return this.algorithmicRanking(opportunities, news);
  }

  private async getOllamaAnalysis(
    opportunities: Opportunity[],
    news: NewsItem[]
  ): Promise<AnalysisResult | null> {
    const prompt = `You are Alpha Hunter, an expert AI trading bot. Analyze these opportunities and recommend the best one.

OPPORTUNITIES:
${JSON.stringify(opportunities.slice(0, 5), null, 2)}

NEWS:
${news.slice(0, 3).map(n => `- ${n.title}`).join('\n')}

Respond ONLY in this exact format:
BEST_INDEX: [number, 0-based]
ANALYSIS: [one sentence market analysis]
RISK: [low/medium/high]
ACTION: [one sentence recommendation]
CONFIDENCE: [0-100]`;

    console.log(`   🤖 Using local AI (${localAI.getModel()}) for opportunity analysis...`);
    const response = await localAI.analyze(prompt);
    if (!response) return null;

    const indexMatch = response.match(/BEST_INDEX:\s*(\d+)/i);
    const analysisMatch = response.match(/ANALYSIS:\s*(.+)/i);
    const riskMatch = response.match(/RISK:\s*(.+)/i);
    const actionMatch = response.match(/ACTION:\s*(.+)/i);
    const confMatch = response.match(/CONFIDENCE:\s*(\d+)/i);

    const bestIndex = parseInt(indexMatch?.[1] || '0');
    console.log(`   ✅ Local AI recommends opportunity #${bestIndex} (confidence: ${confMatch?.[1] || '?'}%)`);

    return {
      topOpportunity: opportunities[bestIndex] || opportunities[0],
      allOpportunities: opportunities,
      marketAnalysis: analysisMatch?.[1]?.trim() || 'Market conditions analyzed by local AI.',
      riskAssessment: riskMatch?.[1]?.trim() || 'Medium risk.',
      recommendedAction: actionMatch?.[1]?.trim() || 'Proceed with caution.',
      confidenceLevel: parseInt(confMatch?.[1] || '60'),
    };
  }

  private algorithmicRanking(
    opportunities: Opportunity[],
    news: NewsItem[]
  ): AnalysisResult {
    // Score each opportunity
    const scored = opportunities.map(opp => {
      let score = 0;

      // Base score from confidence and expected value
      score += opp.confidence * 0.4;
      score += Math.min(opp.expectedValue * 3, 30);

      // Bonus for low risk
      if (opp.riskLevel === 'low') score += 20;
      else if (opp.riskLevel === 'medium') score += 10;

      // Bonus for arbitrage (guaranteed profit)
      if (opp.type === 'arbitrage') score += 25;

      // Bonus for news correlation
      const newsBoost = news.some(n =>
        opp.title.toLowerCase().includes(n.title.split(' ')[0].toLowerCase())
      );
      if (newsBoost) score += 10;

      // Adjust based on learning history
      const relevantLearning = this.learningHistory.filter(l =>
        l.opportunityType === opp.type
      );
      if (relevantLearning.length > 0) {
        const successRate = relevantLearning.filter(l => l.outcome === 'success').length / relevantLearning.length;
        score *= (0.5 + successRate);
      }

      return { ...opp, score };
    });

    // Sort by score
    scored.sort((a, b) => (b as any).score - (a as any).score);

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

  private generateMarketAnalysis(news: NewsItem[]): string {
    const bullish = news.filter(n => n.sentiment === 'bullish').length;
    const bearish = news.filter(n => n.sentiment === 'bearish').length;

    if (bullish > bearish * 2) {
      return 'Market sentiment strongly positive. Good conditions for directional plays.';
    } else if (bearish > bullish * 2) {
      return 'Market sentiment negative. Consider contrarian plays or wait.';
    }
    return 'Mixed market sentiment. Focus on edge-based opportunities.';
  }

  private generateAction(opp: Opportunity): string {
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

  async generateDailyReport(
    analysis: AnalysisResult,
    tradesExecuted: number,
    profit: number
  ): Promise<DailyReport> {
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

  private generateLearnings(): string[] {
    const learnings: string[] = [];

    // Analyze recent history
    const recentOutcomes = this.learningHistory.slice(-20);
    if (recentOutcomes.length === 0) {
      return ['Building initial learning dataset...'];
    }

    // Calculate success rate by type
    const byType: Record<string, { wins: number; total: number }> = {};
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
      } else if (stats.wins / stats.total < 0.4) {
        learnings.push(`Reduce ${type} exposure (${rate}% win rate)`);
      }
    }

    // Check for confidence calibration
    const overconfident = recentOutcomes.filter(l =>
      l.confidence > 70 && l.outcome === 'failure'
    ).length;
    if (overconfident > 3) {
      learnings.push('Recalibrate confidence thresholds - too many high-confidence losses');
    }

    return learnings;
  }

  async generateDailySuggestion(balance: number): Promise<string> {
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

  async getHistoricalPerformance(): Promise<{
    totalTrades: number;
    winRate: number;
    totalProfit: number;
    bestTrade: number;
  }> {
    // This would pull from database in production
    return {
      totalTrades: this.learningHistory.length,
      winRate: this.learningHistory.filter(l => l.outcome === 'success').length /
        Math.max(1, this.learningHistory.length) * 100,
      totalProfit: this.learningHistory.reduce((sum, l) => sum + l.actualReturn, 0),
      bestTrade: Math.max(0, ...this.learningHistory.map(l => l.actualReturn)),
    };
  }

  recordOutcome(learning: LearningData): void {
    this.learningHistory.push(learning);
    // Keep last 100 outcomes
    if (this.learningHistory.length > 100) {
      this.learningHistory.shift();
    }
  }
}

