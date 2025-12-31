// types/prediction.ts

export interface GameAnalysis {
  homeTeam: {
    name: string;
    record: string;
    form: string; // "W-W-L-W-L"
    lastGame: string;
    injuries: string[];
    strengths: string[];
    weaknesses: string[];
  };
  awayTeam: {
    name: string;
    record: string;
    form: string;
    lastGame: string;
    injuries: string[];
    strengths: string[];
    weaknesses: string[];
  };
  matchup: {
    headToHead: string;
    homeAdvantage: number;
    weatherImpact: string;
    keyMatchups: string[];
  };
  betting: {
    spread: number;
    overUnder: number;
    moneyline: {
      home: number;
      away: number;
    };
    publicBetting: {
      home: number;
      away: number;
    };
  };
}

export interface EnhancedPrediction {
  id: string;
  gameDate: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: {
    winner: string;
    confidence: number;
    score: {
      home: number;
      away: number;
    };
  };
  analysis: GameAnalysis;
  reasoning: string[];
  risks: string[];
  betType: 'spread' | 'moneyline' | 'over-under';
  recommendedBet: string;
  timestamp: string;
}
