/**
 * PROGNO-KALSHI CONNECTOR
 * =======================
 * Connects Progno sports predictions to Kalshi sports markets
 * 
 * Maps Kalshi sports markets to Progno predictions for enhanced accuracy
 */

import { PrognoSportsPrediction, ClaudeEffectResult } from './unified-alpha-hunter-integration';

// ============================================
// TYPES
// ============================================

export interface KalshiSportsMarket {
  ticker: string;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume?: number;
  expiration?: string;
  // Extracted info
  sport?: string;
  homeTeam?: string;
  awayTeam?: string;
  marketType?: 'winner' | 'spread' | 'total' | 'prop';
}

export interface EnhancedKalshiPrediction {
  market: KalshiSportsMarket;
  prognoPrediction: PrognoSportsPrediction | null;
  claudeEffect: ClaudeEffectResult | null;
  recommendation: {
    side: 'YES' | 'NO' | 'SKIP';
    confidence: number;
    edge: number;
    reasoning: string[];
    prognoAligned: boolean;
  };
}

// ============================================
// TEAM NAME MAPPINGS
// ============================================

const NFL_TEAMS: Record<string, string[]> = {
  'Arizona Cardinals': ['ARI', 'Cardinals', 'Arizona'],
  'Atlanta Falcons': ['ATL', 'Falcons', 'Atlanta'],
  'Baltimore Ravens': ['BAL', 'Ravens', 'Baltimore'],
  'Buffalo Bills': ['BUF', 'Bills', 'Buffalo'],
  'Carolina Panthers': ['CAR', 'Panthers', 'Carolina'],
  'Chicago Bears': ['CHI', 'Bears', 'Chicago'],
  'Cincinnati Bengals': ['CIN', 'Bengals', 'Cincinnati'],
  'Cleveland Browns': ['CLE', 'Browns', 'Cleveland'],
  'Dallas Cowboys': ['DAL', 'Cowboys', 'Dallas'],
  'Denver Broncos': ['DEN', 'Broncos', 'Denver'],
  'Detroit Lions': ['DET', 'Lions', 'Detroit'],
  'Green Bay Packers': ['GB', 'Packers', 'Green Bay'],
  'Houston Texans': ['HOU', 'Texans', 'Houston'],
  'Indianapolis Colts': ['IND', 'Colts', 'Indianapolis'],
  'Jacksonville Jaguars': ['JAX', 'Jaguars', 'Jacksonville'],
  'Kansas City Chiefs': ['KC', 'Chiefs', 'Kansas City'],
  'Las Vegas Raiders': ['LV', 'Raiders', 'Las Vegas', 'Vegas'],
  'Los Angeles Chargers': ['LAC', 'Chargers'],
  'Los Angeles Rams': ['LAR', 'Rams'],
  'Miami Dolphins': ['MIA', 'Dolphins', 'Miami'],
  'Minnesota Vikings': ['MIN', 'Vikings', 'Minnesota'],
  'New England Patriots': ['NE', 'Patriots', 'New England'],
  'New Orleans Saints': ['NO', 'Saints', 'New Orleans'],
  'New York Giants': ['NYG', 'Giants'],
  'New York Jets': ['NYJ', 'Jets'],
  'Philadelphia Eagles': ['PHI', 'Eagles', 'Philadelphia'],
  'Pittsburgh Steelers': ['PIT', 'Steelers', 'Pittsburgh'],
  'San Francisco 49ers': ['SF', '49ers', 'San Francisco', 'Niners'],
  'Seattle Seahawks': ['SEA', 'Seahawks', 'Seattle'],
  'Tampa Bay Buccaneers': ['TB', 'Buccaneers', 'Tampa Bay', 'Bucs'],
  'Tennessee Titans': ['TEN', 'Titans', 'Tennessee'],
  'Washington Commanders': ['WAS', 'Commanders', 'Washington'],
};

const NBA_TEAMS: Record<string, string[]> = {
  'Atlanta Hawks': ['ATL', 'Hawks', 'Atlanta'],
  'Boston Celtics': ['BOS', 'Celtics', 'Boston'],
  'Brooklyn Nets': ['BKN', 'Nets', 'Brooklyn'],
  'Charlotte Hornets': ['CHA', 'Hornets', 'Charlotte'],
  'Chicago Bulls': ['CHI', 'Bulls', 'Chicago'],
  'Cleveland Cavaliers': ['CLE', 'Cavaliers', 'Cavs', 'Cleveland'],
  'Dallas Mavericks': ['DAL', 'Mavericks', 'Mavs', 'Dallas'],
  'Denver Nuggets': ['DEN', 'Nuggets', 'Denver'],
  'Detroit Pistons': ['DET', 'Pistons', 'Detroit'],
  'Golden State Warriors': ['GSW', 'Warriors', 'Golden State'],
  'Houston Rockets': ['HOU', 'Rockets', 'Houston'],
  'Indiana Pacers': ['IND', 'Pacers', 'Indiana'],
  'Los Angeles Clippers': ['LAC', 'Clippers'],
  'Los Angeles Lakers': ['LAL', 'Lakers'],
  'Memphis Grizzlies': ['MEM', 'Grizzlies', 'Memphis'],
  'Miami Heat': ['MIA', 'Heat', 'Miami'],
  'Milwaukee Bucks': ['MIL', 'Bucks', 'Milwaukee'],
  'Minnesota Timberwolves': ['MIN', 'Timberwolves', 'Wolves', 'Minnesota'],
  'New Orleans Pelicans': ['NOP', 'Pelicans', 'New Orleans'],
  'New York Knicks': ['NYK', 'Knicks', 'New York'],
  'Oklahoma City Thunder': ['OKC', 'Thunder', 'Oklahoma City'],
  'Orlando Magic': ['ORL', 'Magic', 'Orlando'],
  'Philadelphia 76ers': ['PHI', '76ers', 'Sixers', 'Philadelphia'],
  'Phoenix Suns': ['PHX', 'Suns', 'Phoenix'],
  'Portland Trail Blazers': ['POR', 'Blazers', 'Portland', 'Trail Blazers'],
  'Sacramento Kings': ['SAC', 'Kings', 'Sacramento'],
  'San Antonio Spurs': ['SAS', 'Spurs', 'San Antonio'],
  'Toronto Raptors': ['TOR', 'Raptors', 'Toronto'],
  'Utah Jazz': ['UTA', 'Jazz', 'Utah'],
  'Washington Wizards': ['WAS', 'Wizards', 'Washington'],
};

// ============================================
// PROGNO-KALSHI CONNECTOR CLASS
// ============================================

export class PrognoKalshiConnector {
  private prognoBaseUrl: string;
  private apiKey?: string;
  private predictionsCache: Map<string, { data: PrognoSportsPrediction[]; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.prognoBaseUrl = process.env.PROGNO_BASE_URL || 'http://localhost:3008';
    this.apiKey = process.env.BOT_API_KEY;
  }

  /**
   * Parse a Kalshi market title to extract sport and team info
   */
  parseKalshiMarket(market: { ticker: string; title: string; category: string }): KalshiSportsMarket {
    const parsed: KalshiSportsMarket = {
      ticker: market.ticker,
      title: market.title,
      category: market.category,
      yesPrice: 0,
      noPrice: 0,
    };

    const titleLower = market.title.toLowerCase();
    const tickerUpper = market.ticker.toUpperCase();

    // Detect sport from ticker or title
    if (tickerUpper.includes('NFL') || titleLower.includes('nfl')) {
      parsed.sport = 'nfl';
      parsed.homeTeam = this.extractTeam(market.title, NFL_TEAMS);
      parsed.awayTeam = this.extractSecondTeam(market.title, NFL_TEAMS, parsed.homeTeam);
    } else if (tickerUpper.includes('NBA') || titleLower.includes('nba')) {
      parsed.sport = 'nba';
      parsed.homeTeam = this.extractTeam(market.title, NBA_TEAMS);
      parsed.awayTeam = this.extractSecondTeam(market.title, NBA_TEAMS, parsed.homeTeam);
    } else if (tickerUpper.includes('MLB') || titleLower.includes('mlb') || titleLower.includes('baseball')) {
      parsed.sport = 'mlb';
    } else if (tickerUpper.includes('NHL') || titleLower.includes('nhl') || titleLower.includes('hockey')) {
      parsed.sport = 'nhl';
    } else if (tickerUpper.includes('CFB') || titleLower.includes('college football') || titleLower.includes('ncaaf')) {
      parsed.sport = 'cfb';
    } else if (tickerUpper.includes('CBB') || titleLower.includes('college basketball') || titleLower.includes('ncaab')) {
      parsed.sport = 'cbb';
    }

    // Detect market type
    if (titleLower.includes('spread') || titleLower.includes('points')) {
      parsed.marketType = 'spread';
    } else if (titleLower.includes('over') || titleLower.includes('under') || titleLower.includes('total')) {
      parsed.marketType = 'total';
    } else if (titleLower.includes('win') || titleLower.includes('beat') || titleLower.includes('defeat')) {
      parsed.marketType = 'winner';
    } else {
      parsed.marketType = 'prop';
    }

    return parsed;
  }

  private extractTeam(title: string, teams: Record<string, string[]>): string | undefined {
    const titleLower = title.toLowerCase();
    
    for (const [fullName, aliases] of Object.entries(teams)) {
      for (const alias of aliases) {
        if (titleLower.includes(alias.toLowerCase())) {
          return fullName;
        }
      }
    }
    return undefined;
  }

  private extractSecondTeam(
    title: string,
    teams: Record<string, string[]>,
    firstTeam?: string
  ): string | undefined {
    const titleLower = title.toLowerCase();
    
    for (const [fullName, aliases] of Object.entries(teams)) {
      if (fullName === firstTeam) continue;
      
      for (const alias of aliases) {
        if (titleLower.includes(alias.toLowerCase())) {
          return fullName;
        }
      }
    }
    return undefined;
  }

  /**
   * Fetch predictions from Progno for a specific sport
   */
  async getPrognoPredictions(sport: string): Promise<PrognoSportsPrediction[]> {
    const cacheKey = sport;
    const cached = this.predictionsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const params = new URLSearchParams({
        action: 'predictions',
        sport,
        limit: '100'
      });

      const response = await fetch(`${this.prognoBaseUrl}/api/progno/v2?${params}`, {
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : {},
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        console.warn(`   ⚠️  Progno API returned ${response.status}`);
        return [];
      }

      const data = await response.json();
      const predictions = data.data || [];
      
      this.predictionsCache.set(cacheKey, { data: predictions, timestamp: Date.now() });
      return predictions;
    } catch (error: any) {
      console.warn(`   ⚠️  Progno API error: ${error.message}`);
      return [];
    }
  }

  /**
   * Match a Kalshi market to a Progno prediction
   */
  async matchToPrediction(market: KalshiSportsMarket): Promise<PrognoSportsPrediction | null> {
    if (!market.sport) return null;

    const predictions = await this.getPrognoPredictions(market.sport);
    if (predictions.length === 0) return null;

    // Try exact team match first
    if (market.homeTeam && market.awayTeam) {
      const exactMatch = predictions.find(p => 
        (p.homeTeam === market.homeTeam && p.awayTeam === market.awayTeam) ||
        (p.homeTeam === market.awayTeam && p.awayTeam === market.homeTeam)
      );
      if (exactMatch) return exactMatch;
    }

    // Try partial match
    if (market.homeTeam || market.awayTeam) {
      const partialMatch = predictions.find(p => {
        const pTeams = [p.homeTeam.toLowerCase(), p.awayTeam.toLowerCase()];
        if (market.homeTeam && pTeams.includes(market.homeTeam.toLowerCase())) return true;
        if (market.awayTeam && pTeams.includes(market.awayTeam.toLowerCase())) return true;
        return false;
      });
      if (partialMatch) return partialMatch;
    }

    // Try fuzzy title match
    const titleWords = market.title.toLowerCase().split(/\s+/);
    for (const prediction of predictions) {
      const predTeams = [prediction.homeTeam, prediction.awayTeam].map(t => t.toLowerCase());
      const matchScore = titleWords.filter(w => 
        predTeams.some(t => t.includes(w) || w.includes(t))
      ).length;
      
      if (matchScore >= 2) return prediction;
    }

    return null;
  }

  /**
   * Generate enhanced prediction for a Kalshi sports market
   */
  async enhanceKalshiMarket(market: {
    ticker: string;
    title: string;
    category: string;
    yesPrice: number;
    noPrice: number;
    volume?: number;
  }): Promise<EnhancedKalshiPrediction> {
    const parsedMarket = this.parseKalshiMarket(market);
    parsedMarket.yesPrice = market.yesPrice;
    parsedMarket.noPrice = market.noPrice;
    parsedMarket.volume = market.volume;

    const prognoPrediction = await this.matchToPrediction(parsedMarket);
    const claudeEffect = prognoPrediction?.claudeEffect || null;

    // Generate recommendation
    const recommendation = this.generateRecommendation(parsedMarket, prognoPrediction);

    return {
      market: parsedMarket,
      prognoPrediction,
      claudeEffect,
      recommendation
    };
  }

  private generateRecommendation(
    market: KalshiSportsMarket,
    prediction: PrognoSportsPrediction | null
  ): EnhancedKalshiPrediction['recommendation'] {
    const reasoning: string[] = [];
    let side: 'YES' | 'NO' | 'SKIP' = 'SKIP';
    let confidence = 50;
    let edge = 0;
    let prognoAligned = false;

    if (!prediction) {
      reasoning.push('No Progno prediction available for this market');
      return { side, confidence, edge, reasoning, prognoAligned };
    }

    // Calculate Kalshi implied probabilities
    const kalshiYesProb = market.yesPrice / 100;
    const kalshiNoProb = market.noPrice / 100;

    // Get Progno prediction
    const prognoWinProb = prediction.winProbability;
    const prognoConfidence = prediction.confidenceScore;

    // Determine if Progno predicts home or away
    const prognoPredictedWinner = prediction.predictedWinner.toLowerCase();
    const homeWin = prognoPredictedWinner.includes('home') || 
                    prognoPredictedWinner === prediction.homeTeam.toLowerCase();

    reasoning.push(`Progno predicts: ${prediction.predictedWinner} (${(prognoWinProb * 100).toFixed(1)}%)`);
    reasoning.push(`Progno confidence: ${prognoConfidence}%`);

    // Determine market type and side
    if (market.marketType === 'winner') {
      // Market is about who wins
      const marketFavorsHome = market.title.toLowerCase().includes(prediction.homeTeam.toLowerCase());
      
      if (marketFavorsHome) {
        // Market asks "Will home team win?"
        if (homeWin && prognoWinProb > kalshiYesProb) {
          side = 'YES';
          edge = prognoWinProb - kalshiYesProb;
          prognoAligned = true;
          reasoning.push(`Progno favors YES with ${(edge * 100).toFixed(1)}% edge`);
        } else if (!homeWin && (1 - prognoWinProb) > kalshiNoProb) {
          side = 'NO';
          edge = (1 - prognoWinProb) - kalshiNoProb;
          prognoAligned = true;
          reasoning.push(`Progno favors NO with ${(edge * 100).toFixed(1)}% edge`);
        }
      }
    } else if (market.marketType === 'spread') {
      // Use spread edge from Progno
      if (prediction.spread?.edge > 0.02) {
        edge = prediction.spread.edge;
        side = prediction.spread.line < 0 ? 'YES' : 'NO';
        prognoAligned = true;
        reasoning.push(`Spread edge: ${(edge * 100).toFixed(1)}%`);
      }
    }

    // Apply confidence
    if (prognoAligned) {
      confidence = Math.min(95, prognoConfidence + (edge * 100));
      
      // Apply Claude Effect if available
      if (prediction.claudeEffect) {
        const claudeBoost = prediction.claudeEffect.totalEffect * 10;
        confidence = Math.min(95, confidence + claudeBoost);
        reasoning.push(`Claude Effect: +${(claudeBoost).toFixed(1)}%`);

        // Check for warnings
        if (prediction.claudeEffect.dimensions.chaosSensitivity.score > 0.35) {
          reasoning.push('⚠️ High chaos - consider reduced sizing');
          confidence = Math.max(55, confidence - 10);
        }
      }
    }

    // Minimum edge threshold
    if (edge < 0.02) {
      side = 'SKIP';
      reasoning.push('Edge too small (< 2%)');
    }

    // Minimum confidence threshold
    if (confidence < 60) {
      side = 'SKIP';
      reasoning.push('Confidence too low (< 60%)');
    }

    return {
      side,
      confidence: Math.round(confidence),
      edge: Math.round(edge * 10000) / 10000,
      reasoning,
      prognoAligned
    };
  }

  /**
   * Get all enhanced predictions for sports markets
   */
  async enhanceMultipleMarkets(markets: Array<{
    ticker: string;
    title: string;
    category: string;
    yesPrice: number;
    noPrice: number;
    volume?: number;
  }>): Promise<EnhancedKalshiPrediction[]> {
    // Filter to sports markets only
    const sportsMarkets = markets.filter(m => {
      const cat = m.category.toUpperCase();
      const ticker = m.ticker.toUpperCase();
      return ['SPORTS', 'NFL', 'NBA', 'MLB', 'NHL'].some(s => 
        cat.includes(s) || ticker.includes(s)
      );
    });

    console.log(`   📊 Found ${sportsMarkets.length} sports markets to enhance`);

    const enhanced: EnhancedKalshiPrediction[] = [];
    
    for (const market of sportsMarkets) {
      try {
        const result = await this.enhanceKalshiMarket(market);
        enhanced.push(result);
      } catch (error: any) {
        console.warn(`   ⚠️  Failed to enhance ${market.ticker}: ${error.message}`);
      }
    }

    // Sort by edge (highest first)
    return enhanced.sort((a, b) => b.recommendation.edge - a.recommendation.edge);
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let _connectorInstance: PrognoKalshiConnector | null = null;

export function getPrognoKalshiConnector(): PrognoKalshiConnector {
  if (!_connectorInstance) {
    _connectorInstance = new PrognoKalshiConnector();
  }
  return _connectorInstance;
}

export default PrognoKalshiConnector;
