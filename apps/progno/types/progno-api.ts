// ============================================================================
// PROGNO API - TYPE DEFINITIONS
// ============================================================================

export type Sport = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'cfb' | 'cbb' | 'soccer' | 'mma' | 'tennis';
export type BetType = 'spread' | 'moneyline' | 'total' | 'prop' | 'parlay' | 'teaser';
export type Side = 'home' | 'away' | 'over' | 'under';
export type Confidence = 'low' | 'medium' | 'high' | 'very_high' | 'elite';

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  conference?: string;
  division?: string;
  record?: { wins: number; losses: number; ties?: number };
  atsRecord?: { wins: number; losses: number; pushes: number };
}

export interface Game {
  id: string;
  sport: Sport;
  homeTeam: Team;
  awayTeam: Team;
  startTime: Date;
  venue: string;
  weather?: WeatherData;
  isNeutralSite?: boolean;
  broadcast?: string;
}

export interface Odds {
  sportsbook: string;
  spread: { home: number; homeOdds: number; away: number; awayOdds: number };
  moneyline: { home: number; away: number };
  total: { line: number; overOdds: number; underOdds: number };
  timestamp: Date;
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  windGusts: number;
  windDirection: string;
  precipitation: 'none' | 'rain' | 'snow' | 'sleet';
  precipitationChance: number;
  humidity: number;
  visibility: number;
  isDome: boolean;
}

export interface ClaudeEffectResult {
  totalEffect: number;
  totalConfidence: number;
  dimensions: {
    sentimentField: { score: number; confidence: number };
    narrativeMomentum: { score: number; confidence: number };
    informationAsymmetry: { score: number; confidence: number };
    chaosSensitivity: { score: number; category: string; confidenceMultiplier: number };
    networkInfluence: { score: number; confidence: number };
    temporalRelevance: { overallDecay: number };
    emergentPatterns: { score: number; confidence: number };
  };
  weights: { sf: number; nm: number; iai: number; nig: number; epd: number };
  summary: string;
  keyFactors: string[];
  warnings: string[];
}

export interface Prediction {
  id: string;
  gameId: string;
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  predictedWinner: 'home' | 'away';
  winProbability: number;
  confidence: Confidence;
  confidenceScore: number;
  spread: { prediction: Side; line: number; edge: number; probability: number };
  total: { prediction: Side; line: number; edge: number; probability: number };
  recommendation: BetRecommendation;
  claudeEffect: ClaudeEffectResult;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface BetRecommendation {
  shouldBet: boolean;
  primaryPick: {
    type: BetType;
    side: Side;
    line?: number;
    odds: number;
    units: number;
    expectedValue: number;
  } | null;
  secondaryPicks: any[];
  stayAway: boolean;
  stayAwayReason?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: any };
  meta?: { timestamp: Date; version: string; requestId: string; cached: boolean };
}
