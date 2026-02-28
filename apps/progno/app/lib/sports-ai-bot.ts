/**
 * SPORTS AI BOT
 *
 * Local AI assistant that provides sports betting advice based on:
 * - All Progno documentation and codebase
 * - Sports gambling knowledge and best practices
 * - Historical performance data
 * - Current market conditions
 */

export interface SportsAdviceRequest {
  currentPicks: any[];
  historicalPerformance?: any;
  marketConditions?: {
    oddsData?: any;
    injuries?: any;
    weather?: any;
    lineMovements?: any;
  };
  userQuestion?: string;
  context?: string;
}

export interface SportsAdviceResponse {
  advice: string;
  confidence: number;
  reasoning: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  valueBets?: Array<{
    game: string;
    pick: string;
    confidence: number;
    reasoning: string;
  }>;
}

export class SportsAIBot {
  private knowledgeBase: Map<string, any> = new Map();
  private performanceHistory: Map<string, any> = new Map();

  constructor() {
    this.initializeKnowledgeBase();
  }

  /**
   * Initialize with sports betting knowledge
   */
  private initializeKnowledgeBase(): void {
    // Bankroll management principles
    this.knowledgeBase.set('bankroll', {
      kellyCriterion: 'Recommended for value bets: 1-5% of bankroll per bet',
      flatBetting: 'Beginners should use flat betting until profitable',
      unitSize: '1-2% of total bankroll per unit',
      stopLoss: 'Stop betting after 5-7 losses in a row',
      takeProfit: 'Take profit after reaching 25-50% of bankroll growth'
    });

    // Value betting principles
    this.knowledgeBase.set('valueBetting', {
      definition: 'Betting when implied probability < actual probability',
      minimumEdge: 'Minimum 2-3% edge required for long-term profit',
      closingLineValue: 'Line movement against your position indicates value',
      publicBettingPercentages: 'Public betting percentages (53% favorites, 47% underdogs)',
      sharpMoney: 'Sharp money moves early, public money moves late'
    });

    // Sport-specific strategies
    this.knowledgeBase.set('strategies', {
      NFL: {
        keyFactors: ['Quarterback performance', 'offensive line', 'defensive injuries', 'weather', 'home field advantage'],
        bestBettingTypes: ['Against the spread', 'player props', 'live betting'],
        avoid: 'Betting on preseason games, heavy favorites on moneyline'
      },
      NBA: {
        keyFactors: ['Rest days', 'injuries', 'pace of play', '3-point shooting', 'travel schedules'],
        bestBettingTypes: ['Against the spread', 'player props', 'quarter betting'],
        avoid: 'Betting on back-to-backs, teams on long road trips'
      },
      NHL: {
        keyFactors: ['Goaltender performance', 'power play success', 'penalty kill rate', 'injuries', 'travel fatigue'],
        bestBettingTypes: ['Puck line', 'period betting', 'live betting'],
        avoid: 'Betting on teams playing second night of back-to-back'
      },
      MLB: {
        keyFactors: ['Starting pitcher', 'bullpen strength', 'park factors', 'weather', 'umpire tendencies'],
        bestBettingTypes: ['Against the spread', 'first 5 innings', 'player props'],
        avoid: 'Betting on heavy favorites, day games after night games'
      }
    });

    // Risk management
    this.knowledgeBase.set('riskManagement', {
      maxDailyRisk: 'Maximum 5% of bankroll per day',
      diversification: 'Spread bets across different sports, not all in one',
      correlationAvoidance: 'Avoid betting correlated outcomes (multiple bets on same game)',
      emotionalControl: 'Never chase losses, stick to unit size'
    });

    // Market efficiency
    this.knowledgeBase.set('marketEfficiency', {
      lineMovementAnalysis: 'Early line moves indicate sharp action',
      reverseLineMovement: 'Line moving away from public indicates sharp money',
      steamIdentification: 'Rapid line movement across multiple books',
      arbitrageOpportunities: 'Different odds between books create guaranteed profit'
    });
  }

  /**
   * Analyze current picks and provide advice
   */
  async analyzePicks(request: SportsAdviceRequest): Promise<SportsAdviceResponse> {
    const { currentPicks, historicalPerformance, marketConditions, userQuestion, context } = request;

    // Analyze current picks
    const pickAnalysis = this.analyzeCurrentPicks(currentPicks, marketConditions);

    // Generate advice based on user question
    let advice = '';
    let confidence = 0.5;
    let reasoning: string[] = [];
    let recommendations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';

    if (userQuestion?.toLowerCase().includes('bankroll')) {
      const bankrollAdvice = this.generateBankrollAdvice(historicalPerformance);
      advice = bankrollAdvice.advice;
      confidence = bankrollAdvice.confidence;
      reasoning = bankrollAdvice.reasoning;
      recommendations = bankrollAdvice.recommendations;
      riskLevel = bankrollAdvice.riskLevel;
    } else if (userQuestion?.toLowerCase().includes('value')) {
      const valueAdvice = this.generateValueBettingAdvice(currentPicks, marketConditions);
      advice = valueAdvice.advice;
      confidence = valueAdvice.confidence;
      reasoning = valueAdvice.reasoning;
      recommendations = valueAdvice.recommendations;
      riskLevel = valueAdvice.riskLevel;
    } else if (userQuestion?.toLowerCase().includes('strategy')) {
      const strategyAdvice = this.generateStrategyAdvice(currentPicks, historicalPerformance);
      advice = strategyAdvice.advice;
      confidence = strategyAdvice.confidence;
      reasoning = strategyAdvice.reasoning;
      recommendations = strategyAdvice.recommendations;
      riskLevel = strategyAdvice.riskLevel;
    } else {
      // General analysis
      const generalAdvice = this.generateGeneralAdvice(currentPicks, marketConditions);
      advice = generalAdvice.advice;
      confidence = generalAdvice.confidence;
      reasoning = generalAdvice.reasoning;
      recommendations = generalAdvice.recommendations;
      riskLevel = generalAdvice.riskLevel;
    }

    return {
      advice,
      confidence,
      reasoning,
      recommendations,
      riskLevel,
      valueBets: this.identifyValueBets(currentPicks, marketConditions)
    };
  }

  /**
   * Analyze current picks for patterns and issues
   */
  private analyzeCurrentPicks(picks: any[], marketConditions: any): any {
    const analysis: any = {
      totalPicks: picks.length,
      highConfidencePicks: picks.filter(p => p.confidence > 0.8).length,
      lowConfidencePicks: picks.filter(p => p.confidence < 0.6).length,
      averageConfidence: picks.reduce((sum, p) => sum + (p.confidence || 0.5), 0) / picks.length,
      sportsDistribution: this.analyzeSportsDistribution(picks),
      recentPerformance: this.analyzeRecentPerformance(picks)
    };

    // Check for concerning patterns
    if (analysis.lowConfidencePicks > analysis.highConfidencePicks * 2) {
      analysis.warning = 'Too many low-confidence picks';
    }

    if (analysis.averageConfidence < 0.6) {
      analysis.warning = 'Overall confidence below optimal threshold';
    }

    return analysis;
  }

  /**
   * Generate bankroll management advice
   */
  private generateBankrollAdvice(performance: any): any {
    const advice = {
      advice: '',
      confidence: 0.7,
      reasoning: [],
      recommendations: [],
      riskLevel: 'medium' as const
    };

    advice.reasoning.push('Based on historical performance data');
    advice.reasoning.push('Kelly Criterion recommends 1-5% of bankroll per value bet');
    advice.reasoning.push('Flat betting recommended for beginners until consistent profits');
    advice.reasoning.push('Stop-loss discipline crucial for long-term success');

    advice.recommendations.push('Use 1-2% unit size to minimize variance');
    advice.recommendations.push('Set daily loss limit at 5% of bankroll');
    advice.recommendations.push('Take profits at 25-50% bankroll growth milestones');
    advice.recommendations.push('Maintain detailed betting records for performance analysis');

    return advice;
  }

  /**
   * Generate value betting advice
   */
  private generateValueBettingAdvice(picks: any[], marketConditions: any): any {
    const advice = {
      advice: '',
      confidence: 0.6,
      reasoning: [],
      recommendations: [],
      riskLevel: 'medium' as const
    };

    const valueBets = picks.filter(p => p.edge && p.edge > 2);

    advice.reasoning.push('Value betting requires positive expected value (EV)');
    advice.reasoning.push(`Found ${valueBets.length} potential value bets with average edge of ${valueBets.reduce((sum, p) => sum + (p.edge || 0), 0) / valueBets.length}%`);

    if (valueBets.length > 0) {
      advice.confidence = 0.75;
      advice.recommendations.push('Focus on bets with 3%+ edge for optimal long-term growth');
      advice.recommendations.push('Avoid betting on heavy favorites unless you have strong reasoning');
      advice.recommendations.push('Monitor line movement for sharp money indicators');
    } else {
      advice.recommendations.push('Look for opportunities where market misprices probabilities');
      advice.recommendations.push('Consider underdogs when public overvalues favorites');
    }

    return advice;
  }

  /**
   * Generate strategy advice
   */
  private generateStrategyAdvice(picks: any[], performance: any): any {
    const advice = {
      advice: '',
      confidence: 0.65,
      reasoning: [],
      recommendations: [],
      riskLevel: 'low' as const
    };

    advice.reasoning.push('Strategy should be based on your edge and risk tolerance');
    advice.reasoning.push('Consider specializing in 1-2 sports you know well');
    advice.reasoning.push('Avoid betting on too many games simultaneously');

    const sportsAnalysis = this.analyzeSportsDistribution(picks);
    if (sportsAnalysis.primarySport) {
      advice.recommendations.push(`Focus on ${sportsAnalysis.primarySport} - your most profitable sport`);
    }

    return advice;
  }

  /**
   * Generate general advice
   */
  private generateGeneralAdvice(picks: any[], marketConditions: any): any {
    const advice = {
      advice: '',
      confidence: 0.6,
      reasoning: [],
      recommendations: [],
      riskLevel: 'low' as const
    };

    advice.reasoning.push('Review all picks before placing bets');
    advice.reasoning.push('Consider weather and injury impacts');
    advice.reasoning.push('Monitor line movements for betting opportunities');

    return advice;
  }

  /**
   * Analyze sports distribution in picks
   */
  private analyzeSportsDistribution(picks: any[]): any {
    const sportCounts: Record<string, number> = {};

    picks.forEach(pick => {
      const sport = pick.sport || 'Unknown';
      sportCounts[sport] = (sportCounts[sport] || 0) + 1;
    });

    const sortedSports = Object.entries(sportCounts)
      .sort(([, a], [, b]) => b[1] - a[1])
      .slice(0, 3);

    return {
      primarySport: sortedSports[0]?.[0] || 'None',
      distribution: sportCounts,
      topSports: sortedSports.map(([sport]) => sport)
    };
  }

  /**
   * Analyze recent performance
   */
  private analyzeRecentPerformance(picks: any[]): any {
    // This would connect to historical results
    // For now, return basic analysis
    return {
      recentWinRate: 'Calculate from historical data',
      avgConfidence: 'Calculate from historical data',
      bestPerformingSport: 'Determine from historical data'
    };
  }

  /**
   * Identify potential value bets
   */
  private identifyValueBets(picks: any[], marketConditions: any): Array<any> {
    return picks
      .filter(p => p.edge && p.edge > 2)
      .map(p => ({
        game: `${p.homeTeam} vs ${p.awayTeam}`,
        pick: p.pick,
        confidence: p.confidence,
        reasoning: `Value bet with ${p.edge}% edge`
      }))
      .slice(0, 5);
  }

  /**
   * Update knowledge base with new information
   */
  updateKnowledge(newInfo: string, category: string): void {
    const existing = this.knowledgeBase.get(category) || {};
    this.knowledgeBase.set(category, { ...existing, [newInfo]: new Date().toISOString() });
  }

  /**
   * Get knowledge base information
   */
  getKnowledge(category: string): any {
    return this.knowledgeBase.get(category) || {};
  }

  /**
   * Export knowledge base for analysis
   */
  exportKnowledgeBase(): Record<string, any> {
    const obj: Record<string, any> = {};
    this.knowledgeBase.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
}
