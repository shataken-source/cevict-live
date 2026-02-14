import { twitterRecentSearch } from '../app/social/twitter-client';

export interface SocialSentiment {
  positive: number;
  negative: number;
  sampleSize: number;
}

export interface RealTimeData {
  weather?: any;
  injuries?: any;
  sentiment?: SocialSentiment;
  [key: string]: any;
}

export async function getTwitterSentiment(team1: string, team2: string): Promise<SocialSentiment | null> {
  // FIXED: Using simple string concatenation to avoid PowerShell escaping errors
  const query = '(' + team1 + ' OR ' + team2 + ') lang:en -is:retweet';
  
  try {
    const res = await twitterRecentSearch(query, { maxResults: 50 });
    
    if (!res || !res.data) return null;

    let positive = 0;
    let negative = 0;
    const positiveKeywords = ["win", "cover", "lock", "value", "great", "strong", "best bet"];
    const negativeKeywords = ["lose", "fade", "trap", "injury", "bad", "weak", "stay away"];

    for (const tweet of res.data) {
      const text = (tweet.text || "").toLowerCase();
      if (positiveKeywords.some(w => text.includes(w))) positive++;
      if (negativeKeywords.some(w => text.includes(w))) negative++;
    }

    return {
      positive,
      negative,
      sampleSize: res.data.length
    };
  } catch (e) {
    console.error("Sentiment analysis failed:", e);
    return null;
  }
}

export async function fetchAllRealTimeData(...args: any[]): Promise<RealTimeData> {
  const team1 = args[0] || "HomeTeam";
  const team2 = args[1] || "AwayTeam";

  // Run searches in parallel
  const sentiment = await getTwitterSentiment(team1, team2);

  return {
    sentiment,
    weather: null,
    injuries: [],
    lineMovement: []
  };
}

export function integrateRealTimeData(baseProb: number, data: RealTimeData): {
  adjustedPrediction: number;
  adjustments: Array<{ factor: string; impact: number; description: string }>;
} {
  let adjustment = 0;
  const adjustments: Array<{ factor: string; impact: number; description: string }> = [];

  if (data.sentiment && data.sentiment.sampleSize > 5) {
    const total = data.sentiment.positive + data.sentiment.negative;
    if (total > 0) {
      const ratio = data.sentiment.positive / total;
      if (ratio > 0.65) {
        adjustment += 0.05;
        adjustments.push({ factor: 'Sentiment', impact: 0.05, description: 'Public sentiment bullish (+5%)' });
      } else if (ratio < 0.35) {
        adjustment -= 0.05;
        adjustments.push({ factor: 'Sentiment', impact: -0.05, description: 'Public sentiment bearish (-5%)' });
      }
    }
  }

  return {
    adjustedPrediction: Math.min(Math.max(baseProb + adjustment, 0), 1),
    adjustments,
  };
}
