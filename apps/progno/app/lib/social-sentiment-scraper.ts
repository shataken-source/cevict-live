/**
 * Social Sentiment Scraper Service
 * Twitter/X sentiment tracking for injuries, lineup changes, momentum
 */

export interface SentimentAnalysis {
  query: string;
  overallSentiment: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1
  volume: number;
  trending: boolean;
  keyTerms: string[];
  lastUpdate: string;
}

export interface TeamMomentum {
  team: string;
  sentimentScore: number;
  recentMentions: number;
  trendingTopics: string[];
  injuryMentions: number;
  lineupMentions: number;
  momentumIndicator: 'surging' | 'stable' | 'declining';
}

export class SocialSentimentScraper {
  private twitterApiKey: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(twitterApiKey?: string) {
    this.twitterApiKey = twitterApiKey || process.env.TWITTER_API_KEY || '';
  }

  /**
   * Analyze sentiment for a specific team/game
   */
  async analyzeTeamSentiment(
    team: string,
    sport: string,
    hoursBack: number = 24
  ): Promise<TeamMomentum | null> {
    const cacheKey = `${sport}_${team}_${hoursBack}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Construct search queries
      const queries = [
        `${team} ${sport} win`,
        `${team} ${sport} injury`,
        `${team} ${sport} lineup`,
        `${team} ${sport} momentum`,
      ];

      const results = await Promise.all(
        queries.map(q => this.fetchTwitterData(q, hoursBack))
      );

      const momentum = this.processSentimentResults(team, results);
      
      this.cache.set(cacheKey, { data: momentum, timestamp: Date.now() });
      
      return momentum;
    } catch (error) {
      console.error('[Sentiment] Error analyzing sentiment:', error);
      return null;
    }
  }

  /**
   * Monitor for breaking news (injuries, lineup changes)
   */
  async monitorBreakingNews(
    teams: string[],
    sport: string
  ): Promise<Array<{
    team: string;
    type: 'injury' | 'lineup' | 'momentum';
    urgency: 'high' | 'medium' | 'low';
    summary: string;
    timestamp: string;
  }>> {
    const alerts = [];

    for (const team of teams) {
      const sentiment = await this.analyzeTeamSentiment(team, sport, 2); // Last 2 hours
      
      if (!sentiment) continue;

      // Check for injury spikes
      if (sentiment.injuryMentions > 10) {
        alerts.push({
          team,
          type: 'injury',
          urgency: sentiment.injuryMentions > 20 ? 'high' : 'medium',
          summary: `Spike in injury mentions (${sentiment.injuryMentions} in 2h)`,
          timestamp: new Date().toISOString(),
        });
      }

      // Check for lineup changes
      if (sentiment.lineupMentions > 5) {
        alerts.push({
          team,
          type: 'lineup',
          urgency: sentiment.lineupMentions > 15 ? 'high' : 'medium',
          summary: `Lineup discussion spike (${sentiment.lineupMentions} in 2h)`,
          timestamp: new Date().toISOString(),
        });
      }

      // Momentum shift detection
      if (sentiment.momentumIndicator === 'surging' && sentiment.sentimentScore > 0.7) {
        alerts.push({
          team,
          type: 'momentum',
          urgency: 'medium',
          summary: `Positive momentum surge detected`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return alerts.sort((a, b) => {
      const urgencyOrder = { high: 3, medium: 2, low: 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });
  }

  /**
   * Compare sentiment between two teams
   */
  async compareTeams(
    teamA: string,
    teamB: string,
    sport: string
  ): Promise<{
    differential: number;
    advantage: string | null;
    confidence: number;
    reasoning: string;
  }> {
    const [sentimentA, sentimentB] = await Promise.all([
      this.analyzeTeamSentiment(teamA, sport),
      this.analyzeTeamSentiment(teamB, sport),
    ]);

    if (!sentimentA || !sentimentB) {
      return { differential: 0, advantage: null, confidence: 0, reasoning: 'Insufficient data' };
    }

    const differential = sentimentA.sentimentScore - sentimentB.sentimentScore;
    
    let advantage: string | null = null;
    let confidence = 0;
    let reasoning = '';

    if (Math.abs(differential) > 0.3) {
      advantage = differential > 0 ? teamA : teamB;
      confidence = Math.min(80, 50 + Math.abs(differential) * 100);
      reasoning = `${advantage} showing significantly better social sentiment (${Math.abs(differential).toFixed(2)} differential)`;
    } else {
      reasoning = 'Social sentiment relatively balanced between teams';
    }

    return { differential, advantage, confidence, reasoning };
  }

  /**
   * Mock Twitter API fetch (replace with real Twitter API v2 integration)
   */
  private async fetchTwitterData(
    query: string,
    hoursBack: number
  ): Promise<SentimentAnalysis> {
    // TODO: Replace with actual Twitter API v2 call
    // For now, returns mock data structure
    
    if (!this.twitterApiKey) {
      console.log('[Sentiment] No Twitter API key, returning mock data');
      return {
        query,
        overallSentiment: 'neutral',
        score: Math.random() * 0.4 - 0.2,
        volume: Math.floor(Math.random() * 100),
        trending: false,
        keyTerms: [],
        lastUpdate: new Date().toISOString(),
      };
    }

    try {
      // Real Twitter API v2 implementation would go here
      const response = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=100`,
        {
          headers: {
            Authorization: `Bearer ${this.twitterApiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status}`);
      }

      const data = await response.json();
      return this.analyzeTweets(data.data || [], query);
    } catch (error) {
      console.error('[Sentiment] Twitter API error:', error);
      return {
        query,
        overallSentiment: 'neutral',
        score: 0,
        volume: 0,
        trending: false,
        keyTerms: [],
        lastUpdate: new Date().toISOString(),
      };
    }
  }

  /**
   * Analyze tweet sentiment
   */
  private analyzeTweets(tweets: any[], query: string): SentimentAnalysis {
    if (!tweets.length) {
      return {
        query,
        overallSentiment: 'neutral',
        score: 0,
        volume: 0,
        trending: false,
        keyTerms: [],
        lastUpdate: new Date().toISOString(),
      };
    }

    // Simple sentiment analysis
    const positiveWords = ['win', 'great', 'amazing', 'best', 'dominant', 'strong', '🔥', '💪'];
    const negativeWords = ['loss', 'terrible', 'awful', 'injured', 'hurt', 'out', 'bad', '😢', '💔'];

    let score = 0;
    const keyTerms: string[] = [];

    for (const tweet of tweets) {
      const text = tweet.text?.toLowerCase() || '';
      
      positiveWords.forEach(word => {
        if (text.includes(word)) score += 0.1;
      });
      
      negativeWords.forEach(word => {
        if (text.includes(word)) score -= 0.1;
      });

      // Extract injury terms
      if (text.includes('injury') || text.includes('injured') || text.includes('out')) {
        keyTerms.push('injury');
      }
      if (text.includes('lineup') || text.includes('starting')) {
        keyTerms.push('lineup');
      }
    }

    score = Math.max(-1, Math.min(1, score / tweets.length));

    return {
      query,
      overallSentiment: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
      score,
      volume: tweets.length,
      trending: tweets.length > 50,
      keyTerms: [...new Set(keyTerms)],
      lastUpdate: new Date().toISOString(),
    };
  }

  /**
   * Process sentiment results into team momentum
   */
  private processSentimentResults(team: string, results: SentimentAnalysis[]): TeamMomentum {
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const totalVolume = results.reduce((sum, r) => sum + r.volume, 0);
    
    const injuryMentions = results
      .filter(r => r.query.includes('injury'))
      .reduce((sum, r) => sum + r.keyTerms.filter(t => t === 'injury').length, 0);
    
    const lineupMentions = results
      .filter(r => r.query.includes('lineup'))
      .reduce((sum, r) => sum + r.keyTerms.filter(t => t === 'lineup').length, 0);

    const allTerms = results.flatMap(r => r.keyTerms);
    const trendingTopics = [...new Set(allTerms)].slice(0, 5);

    let momentum: TeamMomentum['momentumIndicator'] = 'stable';
    if (avgScore > 0.3 && totalVolume > 20) momentum = 'surging';
    if (avgScore < -0.3 && totalVolume > 20) momentum = 'declining';

    return {
      team,
      sentimentScore: Math.round(avgScore * 100) / 100,
      recentMentions: totalVolume,
      trendingTopics,
      injuryMentions,
      lineupMentions,
      momentumIndicator: momentum,
    };
  }

  /**
   * Get sentiment-based confidence adjustment
   */
  getConfidenceAdjustment(
    teamMomentum: TeamMomentum,
    isHomeTeam: boolean
  ): { adjustment: number; reasoning: string } {
    let adjustment = 0;
    const reasons: string[] = [];

    // Positive sentiment boost
    if (teamMomentum.sentimentScore > 0.4) {
      adjustment += 2;
      reasons.push(`Strong positive social sentiment (${teamMomentum.sentimentScore.toFixed(2)})`);
    }

    // Negative sentiment penalty
    if (teamMomentum.sentimentScore < -0.4) {
      adjustment -= 2;
      reasons.push(`Negative social sentiment (${teamMomentum.sentimentScore.toFixed(2)})`);
    }

    // Injury mentions concern
    if (teamMomentum.injuryMentions > 5) {
      adjustment -= 3;
      reasons.push(`High injury mentions on social media (${teamMomentum.injuryMentions})`);
    }

    // Momentum factor
    if (teamMomentum.momentumIndicator === 'surging') {
      adjustment += 1;
      reasons.push('Team showing positive momentum on social media');
    }

    return {
      adjustment,
      reasoning: reasons.join('; ') || 'No significant social sentiment impact',
    };
  }
}

export default SocialSentimentScraper;
