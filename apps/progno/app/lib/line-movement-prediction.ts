/**
 * Line Movement Prediction Service
 * Predict which direction lines will move
 */

import { createClient } from '@supabase/supabase-js';

export interface LineMovementPrediction {
  gameId: string;
  market: string;
  currentLine: number;
  predictedDirection: 'up' | 'down' | 'stable';
  confidence: number;
  targetLine: number;
  timeframe: string;
  reasoning: string[];
  urgency: 'immediate' | 'soon' | 'later';
}

export interface MovementFactors {
  publicBettingPercentage: number;
  sharpMoneyPercentage: number;
  injuryImpact: number;
  weatherImpact: number;
  historicalVolatility: number;
  timeToGame: number; // hours
}

export class LineMovementPredictionService {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials required');
    }
    this.supabase = createClient(url, key);
  }

  /**
   * Predict line movement for a game
   */
  async predictMovement(
    gameId: string,
    market: string,
    currentLine: number,
    factors: MovementFactors
  ): Promise<LineMovementPrediction> {
    const reasoning: string[] = [];

    // Calculate movement score (-100 to +100)
    let movementScore = 0;

    // Public vs Sharp divergence
    const publicSharpDiff = factors.sharpMoneyPercentage - factors.publicBettingPercentage;
    if (Math.abs(publicSharpDiff) > 15) {
      movementScore += publicSharpDiff * 0.5; // Sharp money moves lines
      reasoning.push(`Sharp/public divergence: ${publicSharpDiff.toFixed(1)}%`);
    }

    // Injury impact
    if (factors.injuryImpact !== 0) {
      movementScore -= factors.injuryImpact * 2; // Injuries move lines against team
      reasoning.push(`Injury impact: ${factors.injuryImpact > 0 ? 'favors away' : 'favors home'}`);
    }

    // Weather impact
    if (Math.abs(factors.weatherImpact) > 2) {
      movementScore += factors.weatherImpact * 1.5;
      reasoning.push(`Weather adjustment: ${factors.weatherImpact > 0 ? 'favors overs' : 'favors unders'}`);
    }

    // Historical volatility
    if (factors.historicalVolatility > 3) {
      reasoning.push(`High historical volatility (${factors.historicalVolatility.toFixed(1)} pts)`);
    }

    // Time urgency
    let urgency: LineMovementPrediction['urgency'] = 'later';
    if (factors.timeToGame < 2) urgency = 'immediate';
    else if (factors.timeToGame < 6) urgency = 'soon';

    if (factors.timeToGame < 24) {
      reasoning.push(`${factors.timeToGame.toFixed(1)}h to game - limited time for movement`);
    }

    // Determine direction
    let predictedDirection: LineMovementPrediction['predictedDirection'] = 'stable';
    if (movementScore > 10) predictedDirection = 'up';
    if (movementScore < -10) predictedDirection = 'down';

    // Calculate target line
    const volatilityFactor = Math.min(factors.historicalVolatility / 5, 1);
    const timeFactor = Math.min(24 / Math.max(factors.timeToGame, 1), 1);
    const expectedMovement = movementScore * 0.05 * volatilityFactor * timeFactor;
    const targetLine = currentLine + expectedMovement;

    // Confidence based on factors
    let confidence = 50;
    confidence += Math.abs(publicSharpDiff) * 0.5;
    confidence += Math.abs(factors.injuryImpact) * 3;
    confidence += factors.historicalVolatility * 2;
    confidence = Math.min(90, Math.max(40, confidence));

    return {
      gameId,
      market,
      currentLine,
      predictedDirection,
      confidence: Math.round(confidence),
      targetLine: Math.round(targetLine * 2) / 2,
      timeframe: this.getTimeframeLabel(factors.timeToGame),
      reasoning,
      urgency,
    };
  }

  /**
   * Get early line advantage recommendations
   */
  async getEarlyLineOpportunities(
    daysAhead: number = 1
  ): Promise<Array<{
    game: any;
    recommendation: 'bet_now' | 'wait' | 'avoid';
    expectedMovement: number;
    confidence: number;
    currentLine: number;
    predictedLine: number;
  }>> {
    const targetDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

    // Get games with early lines
    const { data: games, error } = await this.supabase
      .from('games')
      .select('*')
      .gte('game_time', targetDate)
      .lte('game_time', targetDate.split('T')[0] + 'T23:59:59');

    if (error || !games) return [];

    const opportunities = [];

    for (const game of games as any[]) {
      // Get current odds
      const { data: odds } = await this.supabase
        .from('odds')
        .select('*')
        .eq('game_id', game.id)
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (!odds || odds.length === 0) continue;

      const currentOdds = (odds as any[])[0];

      // Predict movement
      const factors = await this.gatherMovementFactors(game.id);
      const prediction = await this.predictMovement(
        game.id,
        'spread',
        currentOdds.spread,
        factors
      );

      // Determine recommendation
      let recommendation: 'bet_now' | 'wait' | 'avoid' = 'wait';

      if (prediction.urgency === 'immediate' && prediction.confidence > 70) {
        recommendation = 'bet_now';
      } else if (prediction.confidence < 50) {
        recommendation = 'avoid';
      }

      const expectedMovement = Math.abs(prediction.targetLine - prediction.currentLine);

      opportunities.push({
        game,
        recommendation,
        expectedMovement,
        confidence: prediction.confidence,
        currentLine: prediction.currentLine,
        predictedLine: prediction.targetLine,
      });
    }

    return opportunities.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Track prediction accuracy
   */
  async trackAccuracy(): Promise<{
    totalPredictions: number;
    correctDirection: number;
    avgError: number;
    byMarket: Record<string, { correct: number; total: number }>;
  }> {
    const { data, error } = await this.supabase
      .from('line_movement_predictions')
      .select('*')
      .not('actual_result', 'is', null);

    if (error || !data) {
      return { totalPredictions: 0, correctDirection: 0, avgError: 0, byMarket: {} };
    }

    let correct = 0;
    let totalError = 0;
    const byMarket: Record<string, { correct: number; total: number }> = {};

    for (const pred of data as any[]) {
      const market = pred.market;
      if (!byMarket[market]) byMarket[market] = { correct: 0, total: 0 };
      byMarket[market].total++;

      // Check if direction was correct
      const predicted = pred.predicted_direction;
      const actual = pred.actual_result;

      if (predicted === actual) {
        correct++;
        byMarket[market].correct++;
      }

      totalError += Math.abs(pred.target_line - pred.actual_line);
    }

    return {
      totalPredictions: data.length,
      correctDirection: correct,
      avgError: data.length > 0 ? totalError / data.length : 0,
      byMarket,
    };
  }

  private async gatherMovementFactors(gameId: string): Promise<MovementFactors> {
    // Default factors - in real implementation would fetch from various services
    return {
      publicBettingPercentage: 55,
      sharpMoneyPercentage: 45,
      injuryImpact: 0,
      weatherImpact: 0,
      historicalVolatility: 2.5,
      timeToGame: 24,
    };
  }

  private getTimeframeLabel(hours: number): string {
    if (hours < 1) return 'minutes';
    if (hours < 6) return '1-6 hours';
    if (hours < 24) return '6-24 hours';
    if (hours < 72) return '1-3 days';
    return '3+ days';
  }
}

export default LineMovementPredictionService;
