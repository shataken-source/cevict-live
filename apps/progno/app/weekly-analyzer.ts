// Weekly Analyzer Module for Progno Sports Prediction Platform

export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  date: Date;
  odds: {
    // American moneyline odds (e.g., -110, +140)
    home: number;
    away: number;
    spread?: number; // home spread
    total?: number;  // game total
  };
  venue: string;
  weather?: {
    temperature: number;
    conditions: string;
    windSpeed: number;
  };
  injuries?: {
    homeImpact?: number; // negative reduces strength
    awayImpact?: number;
    // Phase 1: Actual injury reports
    homeInjuries?: InjuryReport[];
    awayInjuries?: InjuryReport[];
  };
  turnoversPerGame?: {
    home?: number;
    away?: number;
  };
  homeFieldAdvantage?: number; // override default home bump
  pace?: {
    home?: number; // plays per game
    away?: number;
  };
  // Phase 1: Team Performance Metrics
  teamStats?: {
    home: TeamStats;
    away: TeamStats;
  };
  // Phase 1: Head-to-Head History
  h2hHistory?: {
    recentMeetings: H2HMeeting[];
    homeTeamWins: number;
    awayTeamWins: number;
    homeTeamATS: number;
    awayTeamATS: number;
    averageTotal: number;
  };
  // Phase 2: Rest & Travel Data
  rest?: {
    homeDaysRest: number;
    awayDaysRest: number;
    homeBackToBack: boolean;
    awayBackToBack: boolean;
    homeTravelDistance?: number; // miles
    awayTravelDistance?: number; // miles
    homeTimeZoneChange?: number; // hours
    awayTimeZoneChange?: number; // hours
  };
  // Phase 2: Situational Statistics
  situational?: {
    isPrimetime: boolean;
    isDivisionGame: boolean;
    isRivalryGame: boolean;
    playoffImplications?: {
      home: string; // e.g., "must-win", "clinching", "eliminated"
      away: string;
    };
    homePrimetimeRecord?: { wins: number; losses: number };
    awayPrimetimeRecord?: { wins: number; losses: number };
  };
  // Phase 2: Line Movement
  lineMovement?: {
    openingSpread?: number;
    currentSpread?: number;
    openingTotal?: number;
    currentTotal?: number;
    movementDirection: 'toward_home' | 'toward_away' | 'stable';
    sharpMoneyIndicator?: 'home' | 'away' | 'none';
  };
  // Phase 3: Player-Level Data (mainly for NBA)
  keyPlayers?: {
    home: KeyPlayer[];
    away: KeyPlayer[];
  };
  // Phase 3: Referee Data
  officials?: {
    referee?: string;
    refereeStats?: RefereeStats;
  };
  // Phase 3: Motivation Factors
  motivation?: {
    homeMotivation: number; // 0-1 scale
    awayMotivation: number;
    factors: string[]; // e.g., ["playoff race", "revenge game"]
  };
  // Live data fields
  liveScore?: {
    home: number;
    away: number;
  };
  gameStatus?: 'scheduled' | 'in' | 'post'; // ESPN status states
  gameClock?: string;
  period?: number;
  isCompleted?: boolean;
  isInProgress?: boolean;
  lastUpdate?: Date;
}

// Phase 1: Injury Report Interface
export interface InjuryReport {
  playerName: string;
  position: string;
  status: 'out' | 'questionable' | 'probable' | 'doubtful';
  injury: string;
  impact: 'high' | 'medium' | 'low'; // star player vs role player
}

// Phase 1: Team Statistics Interface
export interface TeamStats {
  // Recent Form
  recentForm: {
    last5Wins: number;
    last5Losses: number;
    last10Wins: number;
    last10Losses: number;
    currentStreak: 'win' | 'loss';
    streakLength: number;
  };
  // Season Statistics
  season: {
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    pointsForPerGame: number;
    pointsAgainstPerGame: number;
  };
  // Home/Away Splits
  homeAway: {
    homeWins: number;
    homeLosses: number;
    awayWins: number;
    awayLosses: number;
    homePointsFor: number;
    homePointsAgainst: number;
    awayPointsFor: number;
    awayPointsAgainst: number;
  };
  // Against the Spread
  ats: {
    wins: number;
    losses: number;
    pushes: number;
    winPercentage: number;
  };
  // Over/Under Record
  totals: {
    overs: number;
    unders: number;
    pushes: number;
    overPercentage: number;
  };
  // Advanced Metrics (sport-specific)
  advanced?: {
    // NFL
    dvoa?: number;
    epaPerPlay?: number;
    successRate?: number;
    // NBA
    netRating?: number;
    offensiveRating?: number;
    defensiveRating?: number;
    // MLB
    woba?: number;
    fip?: number;
    teamWar?: number;
    // NHL
    corsi?: number;
    fenwick?: number;
    pdo?: number;
  };
}

// Phase 1: Head-to-Head Meeting Interface
export interface H2HMeeting {
  date: Date;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string;
  spread?: number;
  total?: number;
  homeCovered: boolean;
  overHit: boolean;
}

// Phase 3: Key Player Interface
export interface KeyPlayer {
  name: string;
  position: string;
  stats: {
    pointsPerGame?: number;
    efficiency?: number;
    recentForm?: number; // last 5 games average
    minutesPerGame?: number;
    usageRate?: number;
  };
  matchupAdvantage?: number; // -1 to 1, how well they match up vs opponent
  isInjured: boolean;
}

// Phase 3: Referee Statistics Interface
export interface RefereeStats {
  penaltyRate: number; // penalties per game average
  homeBias: number; // -1 to 1, negative favors away
  overUnderTrend: 'over' | 'under' | 'neutral';
  paceImpact: number; // -1 to 1, affects game pace
}

export interface ModelCalibration {
  spreadBias?: number; // points to add to home spread (positive = more home dog)
  totalBias?: number;  // points to add to game total
  confidenceBias?: number; // add to modeledHomeProb before symmetry clamp
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

export interface GamePrediction {
  game: Game;
  predictedWinner: string;
  confidence: number;
  predictedScore: {
    home: number;
    away: number;
  };
  keyFactors: string[];
  riskLevel: 'low' | 'medium' | 'high';
  stake: number;
  pick: string;
  edge: number;
  gameId: string;
  rationale: string;
  simulationResults?: {
    winRate: number;
    stdDev?: number;
    iterations?: number;
  };
}

export interface TrendAnalysis {
  homeWinRate: number;
  favoriteWinRate: number;
  overUnderRate: number;
  averageScore: number;
  weatherImpact: number;
}

// Analyze weekly games with optional calibration
// Now automatically enriches games with ALL purchased data sources before prediction
// Uses: SportsDataIO, Rotowire API, API-Football, The Odds API, Historical data
// ENHANCED WITH CLAUDE EFFECT
export async function analyzeWeeklyGames(games: Game[], calibration?: ModelCalibration): Promise<WeeklyAnalysis> {
  // Import Claude Effect integration
  let gatherClaudeData: any = null;
  let applyClaude: any = null;
  if (typeof window === 'undefined') {
    try {
      // Try multiple paths for the integration module
      const claudeIntegration = require('./lib/claude-effect-integration');
      gatherClaudeData = claudeIntegration.gatherClaudeEffectData;
      applyClaude = claudeIntegration.applyClaudeEffect;
    } catch (e) {
      console.warn('[Weekly Analyzer] Claude Effect not available:', e);
    }
  }
  // Import enrichment function dynamically to avoid circular dependencies
  // Only use game-enricher on server-side (it uses fs)
  let enrichGame: ((game: Game) => Promise<Game>) | null = null;
  if (typeof window === 'undefined') {
    try {
      const gameEnricher = require('../lib/data-sources/game-enricher');
      enrichGame = gameEnricher.enrichGame;
    } catch (e) {
      // game-enricher not available (e.g., in client build)
    }
  }

  // Enrich games with all available data sources (async)
  // Only enrich on server-side; on client-side, use games as-is
  const enrichedGames = enrichGame
    ? await Promise.all(
        games.map(async (game) => {
          try {
            return await enrichGame(game);
          } catch (error) {
            // If enrichment fails, use original game
            console.warn(`Failed to enrich game ${game.id}:`, error);
            return game;
          }
        })
      )
    : games; // Client-side: use games without enrichment

  // Predict games with Claude Effect integration
  const predictions = await Promise.all(
    enrichedGames.map(async (game) => {
      try {
        return await predictGame(game, calibration, gatherClaudeData, applyClaude);
      } catch (error) {
        console.warn(`[Weekly Analyzer] Prediction failed for game ${game.id}, using fallback:`, error);
        // Fallback to base prediction without Claude Effect
        return predictGame(game, calibration, null, null);
      }
    })
  );
  // Lower thresholds to generate more picks: confidence >= 55% and edge > 0.5% (0.005)
  const bestBets = predictions.filter(p => p.confidence >= 0.55 && p.edge > 0.005);
  const upsetAlerts = predictions.filter(p => p.riskLevel === 'high');
  const trendAnalysis = calculateTrends(enrichedGames);

  return {
    games: enrichedGames,
    predictions,
    summary: {
      totalGames: enrichedGames.length,
      bestBets,
      upsetAlerts,
      trendAnalysis
    }
  };
}

// Predict individual game outcome with blended Vegas + context factors
// NOW ENHANCED WITH CLAUDE EFFECT
export async function predictGame(
  game: Game,
  calibration?: ModelCalibration,
  gatherClaudeData?: any,
  applyClaude?: any
): Promise<GamePrediction> {
  const ml = viglessImpliedFromMoneylines(game.odds?.home, game.odds?.away);
  const spreadProb = game.odds?.spread !== undefined ? spreadToWinProb(game.odds.spread, game.sport) : null;

  const spreadBias = calibration?.spreadBias ?? 0;
  const totalBias = calibration?.totalBias ?? 0;
  const confidenceBias = calibration?.confidenceBias ?? 0;

  const homeEdge = game.homeFieldAdvantage ?? 0.05; // default 5% bump
  const weatherImpact = calculateWeatherImpact(game.weather); // returns prob delta
  const injuryImpact = calculateInjuryImpact(game.injuries); // prob delta
  const turnoverImpact = calculateTurnoverImpact(game.turnoversPerGame); // prob delta
  const paceImpact = calculatePaceImpact(game.pace); // prob delta on totals
  const teamStatsImpact = calculateTeamStatsImpact(game); // prob delta from team performance
  const h2hImpact = calculateH2HImpact(game); // prob delta from head-to-head

  // Anchor probability to market (vigless ML) when available; otherwise derive from spread.
  const marketHomeProb = ml?.home ?? spreadProb ?? 0.5;

  // Convert contextual factors into a spread-style adjustment for smoother calibration.
  const contextSpreadAdj =
    probToSpread(weatherImpact) +
    probToSpread(injuryImpact) +
    probToSpread(turnoverImpact) +
    probToSpread(homeEdge) +
    probToSpread(teamStatsImpact) +
    probToSpread(h2hImpact);

  const baseSpread = (game.odds?.spread ?? 0) + spreadBias;
  const modeledSpread = clamp(baseSpread - contextSpreadAdj, -25, 25); // negative favors home
  const modeledHomeProb = clamp(
    mixProbs(spreadToWinProb(modeledSpread, game.sport) ?? 0.5, marketHomeProb, 0.65) + confidenceBias,
    0.02,
    0.98
  );

  let finalProbability = modeledHomeProb;
  let finalConfidence = round2(Math.max(modeledHomeProb, 1 - modeledHomeProb));

  // Apply Claude Effect if available
  let claudeEffectData: any = null;
  if (gatherClaudeData && applyClaude) {
    try {
      claudeEffectData = await gatherClaudeData({
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        league: game.sport,
        date: game.date,
        odds: game.odds,
        weather: game.weather,
        injuries: game.injuries,
        id: game.id,
        schedule: game.situational,
        lineMovement: game.lineMovement,
      }, {
        includePhase1: true,
        includePhase2: true,
        includePhase3: true,
        includePhase4: true,
        includePhase5: false,
        includePhase6: false,
        includePhase7: false,
      });

      const claudeResult = await applyClaude(
        finalProbability,
        finalConfidence,
        game,
        claudeEffectData
      );

      // Use Claude Effect adjusted values
      finalProbability = claudeResult.adjustedProbability;
      finalConfidence = claudeResult.adjustedConfidence;

      // Store Claude Effect result for return
      claudeEffectData = claudeResult;

      // Claude Effect insights will be added to keyFactors later
    } catch (error) {
      console.warn(`[Predict Game] Claude Effect failed for ${game.id}:`, error);
      claudeEffectData = null;
    }
  }

  const predictedWinner = finalProbability >= (1 - finalProbability) ? game.homeTeam : game.awayTeam;
  const confidence = finalConfidence;

  // Score projection: use total/spread math first, then adjust for weather/pace.
  const baseTotal = (game.odds?.total ?? 44) + totalBias;
  const totalAdj = (paceImpact * 12) + (weatherImpact * -18);
  const modeledTotal = Math.max(18, round1(baseTotal + totalAdj));
  const modeledHomeScore = Math.max(0, Math.round((modeledTotal / 2) + (modeledSpreadToPoints(modeledSpread) / 2)));
  const modeledAwayScore = Math.max(0, Math.round(modeledTotal - modeledHomeScore));

  const edge = round2(confidence - (ml ? ml.home : 0.5));
  const riskLevel: 'low' | 'medium' | 'high' =
    confidence >= 0.64 && edge >= 0.04 ? 'low'
      : confidence <= 0.55 || edge < 0.015 ? 'high'
      : 'medium';
  // Lower edge threshold from 0.01 (1%) to 0.005 (0.5%) to generate more picks
  const pick = edge < 0.005 ? 'pass' : predictedWinner;
  const stake = Math.max(10, Math.round(Math.abs(edge) * 300));

  const keyFactors = [
    `Market (vigless) win prob: ${(marketHomeProb * 100).toFixed(1)}%`,
    `Context spread adj: ${round1(contextSpreadAdj)} pts`,
    `Weather impact: ${(weatherImpact * 100).toFixed(1)}%`,
    `Injuries impact: ${(injuryImpact * 100).toFixed(1)}%`,
    `Turnovers impact: ${(turnoverImpact * 100).toFixed(1)}%`,
    game.teamStats ? `Team stats impact: ${(teamStatsImpact * 100).toFixed(1)}%` : null,
    game.h2hHistory ? `H2H impact: ${(h2hImpact * 100).toFixed(1)}%` : null,
    game.odds?.spread !== undefined ? `Line spread: ${game.odds.spread}` : 'Line spread: n/a',
    game.odds?.total ? `Line total: ${game.odds.total}` : 'Line total: n/a'
  ].filter(f => f !== null) as string[];

  // Add Claude Effect insights to key factors
  if (claudeEffectData && claudeEffectData.reasoning && claudeEffectData.reasoning.length > 0) {
    keyFactors.push(`Claude Effect: ${claudeEffectData.reasoning.slice(0, 2).join('; ')}`);
  }
  if (claudeEffectData && claudeEffectData.warnings && claudeEffectData.warnings.length > 0) {
    keyFactors.push(`⚠️ ${claudeEffectData.warnings[0]}`);
  }

  const prediction: GamePrediction = {
    game,
    predictedWinner,
    confidence,
    predictedScore: { home: modeledHomeScore, away: modeledAwayScore },
    keyFactors,
    riskLevel,
    stake,
    pick,
    edge,
    gameId: game.id,
    rationale: keyFactors.join('. ') || 'Positive edge identified',
    simulationResults: {
      winRate: confidence
    }
  };

  // Attach Claude Effect data if available
  if (claudeEffectData) {
    (prediction as any).claudeEffect = claudeEffectData;
  }

  return prediction;
}

function calculateWeatherImpact(weather?: Game['weather']): number {
  if (!weather) return 0;
  let impact = 0;
  if (weather.temperature < 32) impact -= 0.05;
  else if (weather.temperature > 90) impact -= 0.03;
  if (weather.windSpeed > 20) impact -= 0.08;
  else if (weather.windSpeed > 12) impact -= 0.05;
  else if (weather.windSpeed > 8) impact -= 0.02;
  const cond = weather.conditions?.toLowerCase?.() || '';
  if (cond.includes('rain') || cond.includes('snow')) impact -= 0.07;
  return impact;
}

function calculateInjuryImpact(injuries?: Game['injuries']): number {
  if (!injuries) return 0;
  const homeImpact = injuries.homeImpact ?? 0;
  const awayImpact = injuries.awayImpact ?? 0;
  return clamp((awayImpact - homeImpact) * 0.5, -0.1, 0.1);
}

// Enhanced prediction that uses team stats and H2H history
function calculateTeamStatsImpact(game: Game): number {
  if (!game.teamStats) return 0;

  const home = game.teamStats.home;
  const away = game.teamStats.away;

  // Recent form impact (last 5 games)
  const homeForm = home.recentForm.last5Wins / (home.recentForm.last5Wins + home.recentForm.last5Losses || 1);
  const awayForm = away.recentForm.last5Wins / (away.recentForm.last5Wins + away.recentForm.last5Losses || 1);
  const formImpact = (homeForm - awayForm) * 0.03; // Max 3% swing

  // Points per game differential
  const ppgDiff = (home.season.pointsForPerGame - home.season.pointsAgainstPerGame) -
                  (away.season.pointsForPerGame - away.season.pointsAgainstPerGame);
  const ppgImpact = clamp(ppgDiff / 100, -0.05, 0.05); // Max 5% swing

  return clamp(formImpact + ppgImpact, -0.08, 0.08);
}

function calculateH2HImpact(game: Game): number {
  if (!game.h2hHistory || game.h2hHistory.recentMeetings.length === 0) return 0;

  const h2h = game.h2hHistory;
  const totalGames = h2h.recentMeetings.length;

  if (totalGames === 0) return 0;

  // Home team's win rate in H2H
  const homeWinRate = h2h.homeTeamWins / totalGames;
  const expectedWinRate = 0.5; // Neutral expectation
  const h2hImpact = (homeWinRate - expectedWinRate) * 0.04; // Max 4% swing

  return clamp(h2hImpact, -0.06, 0.06);
}

function calculateTurnoverImpact(turnovers?: Game['turnoversPerGame']): number {
  if (!turnovers) return 0;
  const home = turnovers.home ?? 1.2;
  const away = turnovers.away ?? 1.2;
  const diff = (away - home) * 0.03;
  return clamp(diff, -0.08, 0.08);
}

function calculatePaceImpact(pace?: Game['pace']): number {
  if (!pace) return 0;
  const home = pace.home ?? 65;
  const away = pace.away ?? 65;
  const avg = (home + away) / 2;
  return clamp((avg - 65) * 0.0025, -0.05, 0.05);
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function normalCdf(x: number, mean = 0, std = 1): number {
  const z = (x - mean) / (std * Math.SQRT2);
  return 0.5 * (1 + erfApprox(z));
}

function erfApprox(x: number): number {
  // Abramowitz & Stegun approximation
  const sign = x < 0 ? -1 : 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

const SPREAD_STD_BY_SPORT: Record<string, number> = {
  NFL: 13.5,
  NCAAF: 15,
  NBA: 12,
  NCAAB: 11,
  MLB: 4,
  NHL: 4
};

function spreadToWinProb(spread: number, sport: string): number | null {
  const std = SPREAD_STD_BY_SPORT[sport] ?? 12;
  // Spread is home spread; negative means home favored.
  const z = (-spread) / std; // probability home wins outright
  const probHome = normalCdf(z);
  return clamp(probHome, 0.02, 0.98);
}

function modeledSpreadToPoints(spread: number): number {
  // Convert modeled spread back into points difference for score projection.
  return spread;
}

function probToSpread(probDelta: number): number {
  // Approximate conversion from probability delta to spread (inverse of spreadToWinProb slope near zero).
  return clamp(probDelta * 30, -10, 10);
}

function viglessImpliedFromMoneylines(home?: number, away?: number): { home: number; away: number } | null {
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  const homeDec = moneylineToDecimal(home as number);
  const awayDec = moneylineToDecimal(away as number);
  if (!homeDec || !awayDec) return null;
  const homeImp = 1 / homeDec;
  const awayImp = 1 / awayDec;
  const sum = homeImp + awayImp;
  if (sum <= 0) return null;
  return { home: homeImp / sum, away: awayImp / sum };
}

function moneylineToDecimal(odds: number): number | null {
  if (!Number.isFinite(odds) || odds === 0) return null;
  if (odds > 0) return 1 + odds / 100;
  return 1 + 100 / Math.abs(odds);
}

function mixProbs(primary: number, secondary: number, weightPrimary: number): number {
  return (primary * weightPrimary) + (secondary * (1 - weightPrimary));
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function calculateTrends(games: Game[]): TrendAnalysis {
  if (games.length === 0) {
    return {
      homeWinRate: 0,
      favoriteWinRate: 0,
      overUnderRate: 0,
      averageScore: 0,
      weatherImpact: 0
    };
  }

  let homeFavored = 0;
  let homeFavoredWins = 0;
  let totals = 0;
  let weatherSum = 0;

  games.forEach(game => {
    const spread = game.odds?.spread ?? 0;
    if (spread < 0) {
      homeFavored++;
      homeFavoredWins += 0.6; // expected value placeholder
    }
    totals += game.odds?.total ?? 44;
    weatherSum += calculateWeatherImpact(game.weather);
  });

  return {
    homeWinRate: homeFavored ? homeFavoredWins / homeFavored : 0.5,
    favoriteWinRate: homeFavored ? homeFavoredWins / homeFavored : 0.5,
    overUnderRate: 0.5,
    averageScore: totals / games.length,
    weatherImpact: weatherSum / games.length
  };
}

