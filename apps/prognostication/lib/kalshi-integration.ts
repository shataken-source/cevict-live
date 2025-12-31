/**
 * Integration with Alpha Hunter's Kalshi Trading Bot
 * Pulls real predictions from our category learners
 */

export interface LiveKalshiPick {
  marketId: string;
  title: string;
  category: string;
  prediction: 'yes' | 'no';
  probability: number;
  confidence: number;
  edge: number;
  reasoning: string[];
  factors: string[];
  learnedFrom: string[];
  yesPrice: number;
  noPrice: number;
  expiresAt?: Date;
}

export interface KalshiPickResponse {
  id: string;
  market: string;
  category: string;
  pick: 'YES' | 'NO';
  probability: number;
  edge: number;
  marketPrice: number;
  expires: string;
  reasoning: string;
  confidence: number;
  historicalPattern?: string;
}

/**
 * Fetch live picks from our alpha-hunter bot
 */
export async function fetchLiveKalshiPicks(category?: string): Promise<KalshiPickResponse[]> {
  try {
    // Try to read from the dashboard data file that our bot pushes to
    const fs = await import('fs');
    const path = await import('path');

    const dataFile = path.join(process.cwd(), '../alpha-hunter/.kalshi-picks.json');

    if (fs.existsSync(dataFile)) {
      const content = fs.readFileSync(dataFile, 'utf8');
      const data = JSON.parse(content) as { picks: LiveKalshiPick[]; timestamp: string };

      // Filter by category if provided
      let picks = data.picks || [];
      if (category && category !== 'all') {
        picks = picks.filter(p => p.category.toLowerCase() === category.toLowerCase());
      }

      // Transform to our API format
      return picks.map(pick => ({
        id: pick.marketId,
        market: pick.title,
        category: pick.category.toLowerCase(),
        pick: pick.prediction.toUpperCase() as 'YES' | 'NO',
        probability: pick.probability,
        edge: pick.edge,
        marketPrice: pick.prediction === 'yes' ? pick.yesPrice : pick.noPrice,
        expires: pick.expiresAt ? pick.expiresAt.toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        reasoning: pick.reasoning.join(' ') || pick.factors.join(', '),
        confidence: pick.confidence,
        historicalPattern: pick.learnedFrom.join(', '),
      }));
    }

    // If no file exists yet, return empty array
    return [];
  } catch (error) {
    console.error('Error fetching live Kalshi picks:', error);
    return [];
  }
}

/**
 * Check if we have fresh live data (< 1 hour old)
 */
export async function hasRecentLiveData(): Promise<boolean> {
  try {
    const fs = await import('fs');
    const path = await import('path');

    const dataFile = path.join(process.cwd(), '../alpha-hunter/.kalshi-picks.json');

    if (!fs.existsSync(dataFile)) {
      return false;
    }

    const content = fs.readFileSync(dataFile, 'utf8');
    const data = JSON.parse(content);
    const timestamp = new Date(data.timestamp);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return timestamp > hourAgo;
  } catch {
    return false;
  }
}

