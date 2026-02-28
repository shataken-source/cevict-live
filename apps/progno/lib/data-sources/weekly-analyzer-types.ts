// lib/data-sources/weekly-analyzer-types.ts
// Type definitions used by weekly-analyzer and related modules

export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league?: string;
  homeTeamRating?: number;
  awayTeamRating?: number;
  date?: string;
  time?: string;
  venue?: string;
  weather?: any;
  injuries?: any;
  [key: string]: any;
}

export interface GamePrediction {
  game: Game;
  predictedWinner: string;
  confidence: number;
  predictedScore: { home: number; away: number };
  keyFactors: string[];
  riskLevel: 'low' | 'medium' | 'high';
  stake: number;
  pick: string;
  edge: number;
  gameId: string;
  rationale?: string;
  [key: string]: any;
}

export interface ModelCalibration {
  weights?: Record<string, number>;
  biases?: Record<string, number>;
  version?: string;
  [key: string]: any;
}

export interface WeeklyAnalysis {
  games: Game[];
  predictions: GamePrediction[];
  summary: {
    totalGames: number;
    bestBets: GamePrediction[];
    upsetAlerts: GamePrediction[];
    trendAnalysis: TrendAnalysis;
  };
}

export interface TrendAnalysis {
  homeWinRate: number;
  favoriteWinRate: number;
  overUnderRate: number;
  averageScore: number;
  weatherImpact: number;
}

export interface H2HMeeting {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string;
  [key: string]: any;
}
