// OddsJam Fetcher Module for Progno Sports Prediction Platform

export interface OddsJamGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  startTime: Date;
  status: 'scheduled' | 'in_progress' | 'final';
  odds?: OddsJamOdds[];
}

export interface OddsJamOdds {
  sportsbook: string;
  homeOdds: number;
  awayOdds: number;
  spread?: number;
  total?: number;
  homeSpreadOdds?: number;
  awaySpreadOdds?: number;
  overOdds?: number;
  underOdds?: number;
  updated: Date;
}

export interface OddsJamPlayerProps {
  gameId: string;
  playerName: string;
  team: string;
  propType: 'points' | 'rebounds' | 'assists' | 'yards' | 'touchdowns' | 'passing_yards' | 'rushing_yards';
  overUnder: number;
  overOdds: number;
  underOdds: number;
  sportsbook: string;
}

export interface OddsJamInjury {
  gameId: string;
  playerName: string;
  team: string;
  status: 'questionable' | 'doubtful' | 'out' | 'inactive';
  position: string;
  impact: 'high' | 'medium' | 'low';
}

export interface ArbitrageOpportunity {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  opportunities: ArbitrageBet[];
  guaranteedProfit: number;
  totalInvestment: number;
  profitPercentage: number;
  confidence: number;
  expiryTime: Date;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ArbitrageBet {
  sportsbook: string;
  team: 'home' | 'away';
  odds: number;
  impliedProbability: number;
  stake: number;
  potentialReturn: number;
  betType: 'moneyline' | 'spread' | 'total';
}

// API Key management
let oddsjamAPIKey: string | null = null;

export function getOddsJamAPIKey(): string {
  if (!oddsjamAPIKey) {
    oddsjamAPIKey = process.env.ODDSJAM_API_KEY || null;
  }
  return oddsjamAPIKey || '';
}

export function setOddsJamAPIKey(key: string): void {
  oddsjamAPIKey = key;
}

// Fetch games from OddsJam API
export async function fetchOddsJamGames(sport?: string, league?: string): Promise<OddsJamGame[]> {
  const apiKey = getOddsJamAPIKey();
  if (!apiKey) {
    throw new Error('OddsJam API key not configured');
  }

  try {
    const url = new URL('https://api.oddsjam.com/v1/games');
    url.searchParams.append('key', apiKey);
    if (sport) url.searchParams.append('sport', sport);
    if (league) url.searchParams.append('league', league);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`OddsJam API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch OddsJam games:', error);
    throw error;
  }
}

// Fetch odds from OddsJam API
export async function fetchOddsJamOdds(gameIds: string[]): Promise<OddsJamOdds[]> {
  const apiKey = getOddsJamAPIKey();
  if (!apiKey) throw new Error('OddsJam API key not configured');

  try {
    const url = new URL('https://api.oddsjam.com/v1/odds');
    url.searchParams.append('key', apiKey);
    url.searchParams.append('game_ids', gameIds.join(','));

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`OddsJam API error: ${response.status}`);

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch OddsJam odds:', error);
    throw error;
  }
}

// Fetch player props from OddsJam API
export async function fetchOddsJamPlayerProps(
  sport?: string,
  gameId?: string
): Promise<OddsJamPlayerProps[]> {
  const apiKey = getOddsJamAPIKey();
  if (!apiKey) throw new Error('OddsJam API key not configured');

  try {
    const url = new URL('https://api.oddsjam.com/v1/player-props');
    url.searchParams.append('key', apiKey);
    if (sport) url.searchParams.append('sport', sport);
    if (gameId) url.searchParams.append('game_id', gameId);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`OddsJam API error: ${response.status}`);

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch OddsJam player props:', error);
    throw error;
  }
}

// Fetch injury information from OddsJam API
export async function fetchOddsJamInjuries(
  sport?: string,
  league?: string
): Promise<OddsJamInjury[]> {
  const apiKey = getOddsJamAPIKey();
  if (!apiKey) throw new Error('OddsJam API key not configured');

  try {
    const url = new URL('https://api.oddsjam.com/v1/injuries');
    url.searchParams.append('key', apiKey);
    if (sport) url.searchParams.append('sport', sport);
    if (league) url.searchParams.append('league', league);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`OddsJam API error: ${response.status}`);

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch OddsJam injuries:', error);
    throw error;
  }
}

// Convert OddsJam games to Progno game format
export function convertOddsJamToPrognoGames(oddsjamGames: OddsJamGame[]): any[] {
  return oddsjamGames.map(game => {
    const bestOdds = game.odds && game.odds.length > 0
      ? game.odds.reduce((best, current) =>
          Math.abs(current.homeOdds) > Math.abs(best.homeOdds) ? current : best
        )
      : null;

    return {
      id: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      sport: game.sport,
      date: game.startTime,
      odds: {
        home: bestOdds?.homeOdds || -110,
        away: bestOdds?.awayOdds || -110,
        spread: bestOdds?.spread || 0,
        total: bestOdds?.total || 45
      },
      venue: `${game.homeTeam} Stadium`,
      vegasSpread: bestOdds?.spread || 0,
      vegasTotal: bestOdds?.total || 45,
      oddsSource: 'OddsJam',
      homeSpreadOdds: bestOdds?.homeSpreadOdds || -110,
      awaySpreadOdds: bestOdds?.awaySpreadOdds || -110,
      overOdds: bestOdds?.overOdds || -110,
      underOdds: bestOdds?.underOdds || -110
    };
  });
}

// Find arbitrage opportunities using OddsJam data
export function findOddsJamArbitrage(oddsjamGames: OddsJamGame[]): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  for (const game of oddsjamGames) {
    if (!game.odds || game.odds.length < 2) continue;

    // Find best odds for each team across all sportsbooks
    const bestHomeOdds = game.odds.reduce((best, current) =>
      current.homeOdds > best.homeOdds ? current : best
    );

    const bestAwayOdds = game.odds.reduce((best, current) =>
      current.awayOdds > best.awayOdds ? current : best
    );

    // Calculate implied probabilities
    const homeImpliedProb = calculateImpliedProbability(bestHomeOdds.homeOdds);
    const awayImpliedProb = calculateImpliedProbability(bestAwayOdds.awayOdds);
    const totalImpliedProb = homeImpliedProb + awayImpliedProb;

    // Arbitrage exists if total implied probability is less than 100%
    if (totalImpliedProb >= 100) continue;

    // Calculate optimal stakes and profit
    const totalInvestment = 1000;
    const homeStake = (totalInvestment * awayImpliedProb) / totalImpliedProb;
    const awayStake = (totalInvestment * homeImpliedProb) / totalImpliedProb;

    const homeReturn = calculateReturn(homeStake, bestHomeOdds.homeOdds);
    const awayReturn = calculateReturn(awayStake, bestAwayOdds.awayOdds);
    const guaranteedProfit = Math.min(homeReturn, awayReturn) - totalInvestment;

    if (guaranteedProfit <= 0) continue;

    const profitPercentage = (guaranteedProfit / totalInvestment) * 100;

    opportunities.push({
      gameId: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      sport: game.sport,
      opportunities: [
        {
          sportsbook: bestHomeOdds.sportsbook,
          team: 'home',
          odds: bestHomeOdds.homeOdds,
          impliedProbability: homeImpliedProb,
          stake: homeStake,
          potentialReturn: homeReturn,
          betType: 'moneyline'
        },
        {
          sportsbook: bestAwayOdds.sportsbook,
          team: 'away',
          odds: bestAwayOdds.awayOdds,
          impliedProbability: awayImpliedProb,
          stake: awayStake,
          potentialReturn: awayReturn,
          betType: 'moneyline'
        }
      ],
      guaranteedProfit,
      totalInvestment,
      profitPercentage,
      confidence: Math.min(95, Math.max(50, (100 - totalImpliedProb) * 2)),
      expiryTime: new Date(Date.now() + 60 * 60 * 1000),
      riskLevel: profitPercentage > 2 ? 'low' : profitPercentage > 1 ? 'medium' : 'high'
    });
  }

  return opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
}

// Helper functions
function calculateImpliedProbability(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
}

function calculateReturn(stake: number, odds: number): number {
  if (odds > 0) {
    return stake + (stake * odds / 100);
  } else {
    return stake + (stake / Math.abs(odds) * 100);
  }
}

// Get live odds updates
export async function fetchOddsJamLiveOdds(gameIds: string[]): Promise<OddsJamOdds[]> {
  const apiKey = getOddsJamAPIKey();
  if (!apiKey) throw new Error('OddsJam API key not configured');

  try {
    const url = new URL('https://api.oddsjam.com/v1/live-odds');
    url.searchParams.append('key', apiKey);
    url.searchParams.append('game_ids', gameIds.join(','));

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`OddsJam API error: ${response.status}`);

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch live OddsJam odds:', error);
    throw error;
  }
}

// Get betting trends
export async function fetchOddsJamTrends(
  sport?: string,
  timeframe: '1h' | '6h' | '24h' | '7d' = '24h'
): Promise<{
  gameId: string;
  team: 'home' | 'away';
  betPercentage: number;
  lineMovement: number;
  sportsbook: string;
}[]> {
  const apiKey = getOddsJamAPIKey();
  if (!apiKey) throw new Error('OddsJam API key not configured');

  try {
    const url = new URL('https://api.oddsjam.com/v1/trends');
    url.searchParams.append('key', apiKey);
    if (sport) url.searchParams.append('sport', sport);
    url.searchParams.append('timeframe', timeframe);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`OddsJam API error: ${response.status}`);

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch OddsJam trends:', error);
    throw error;
  }
}
