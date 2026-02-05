/**
 * API-Football Integration for PROGNO
 *
 * Provides comprehensive sports data including:
 * - Fixtures and live scores
 * - Team and player statistics
 * - Head-to-head records
 * - Injury reports
 * - League standings
 * - Pre-match odds
 *
 * API Documentation: https://www.api-football.com/documentation-v3
 * Base URL: https://v3.football.api-sports.io
 */

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';

export interface ApiFootballFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    venue: {
      id: number | null;
      name: string | null;
      city: string | null;
    };
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string | null;
    flag: string | null;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string | null;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string | null;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: {
      home: number | null;
      away: number | null;
    };
    fulltime: {
      home: number | null;
      away: number | null;
    };
    extratime: {
      home: number | null;
      away: number | null;
    };
    penalty: {
      home: number | null;
      away: number | null;
    };
  };
}

export interface ApiFootballStanding {
  rank: number;
  team: {
    id: number;
    name: string;
    logo: string;
  };
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  status: string | null;
  description: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
  home: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
  away: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
}

export interface ApiFootballPlayer {
  id: number;
  name: string;
  age: number;
  birth: {
    date: string;
    place: string | null;
    country: string;
  };
  nationality: string;
  height: string | null;
  weight: string | null;
  injured: boolean;
  photo: string | null;
}

export interface ApiFootballInjury {
  player: {
    id: number;
    name: string;
    photo: string | null;
  };
  team: {
    id: number;
    name: string;
    logo: string | null;
  };
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    venue: {
      id: number | null;
      name: string | null;
      city: string | null;
    };
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    season: number;
    name: string;
    country: string;
    logo: string | null;
    flag: string | null;
  };
}

/**
 * Get API key from environment
 */
function getApiKey(): string | null {
  return process.env.API_FOOTBALL_KEY || null;
}

/**
 * Make authenticated request to API-Football
 */
async function apiRequest<T>(endpoint: string): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[API-Football] API key not configured');
    return null;
  }

  try {
    const url = `${API_FOOTBALL_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`[API-Football] Request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.response || null;
  } catch (error: any) {
    console.error('[API-Football] Request error:', error.message);
    return null;
  }
}

/**
 * Get fixtures for a specific date or date range
 */
export async function getFixtures(params: {
  league?: number;
  team?: number;
  date?: string; // YYYY-MM-DD
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  season?: number;
  status?: 'NS' | 'LIVE' | 'FT' | 'POSTPONED' | 'CANCELED' | 'SUSPENDED' | 'INT';
}): Promise<ApiFootballFixture[]> {
  const queryParams = new URLSearchParams();

  if (params.league) queryParams.append('league', params.league.toString());
  if (params.team) queryParams.append('team', params.team.toString());
  if (params.date) queryParams.append('date', params.date);
  if (params.from) queryParams.append('from', params.from);
  if (params.to) queryParams.append('to', params.to);
  if (params.season) queryParams.append('season', params.season.toString());
  if (params.status) queryParams.append('status', params.status);

  const endpoint = `/fixtures?${queryParams.toString()}`;
  const response = await apiRequest<ApiFootballFixture[]>(endpoint);
  return response || [];
}

/**
 * Get league standings
 */
export async function getStandings(params: {
  league: number;
  season: number;
}): Promise<ApiFootballStanding[]> {
  const endpoint = `/standings?league=${params.league}&season=${params.season}`;
  const response = await apiRequest<any>(endpoint);

  if (response && Array.isArray(response) && response[0]?.league?.standings) {
    return response[0].league.standings[0] || [];
  }

  return [];
}

/**
 * Get head-to-head record between two teams
 */
export async function getHeadToHead(params: {
  team1: number;
  team2: number;
  last?: number; // Number of previous meetings (default: 10)
}): Promise<ApiFootballFixture[]> {
  const last = params.last || 10;
  const endpoint = `/fixtures/headtohead?h2h=${params.team1}-${params.team2}&last=${last}`;
  const response = await apiRequest<ApiFootballFixture[]>(endpoint);
  return response || [];
}

/**
 * Get team statistics for a specific league/season
 */
export async function getTeamStatistics(params: {
  team: number;
  league: number;
  season: number;
}): Promise<any> {
  const endpoint = `/teams/statistics?team=${params.team}&league=${params.league}&season=${params.season}`;
  const response = await apiRequest<any>(endpoint);
  return response || null;
}

/**
 * Get player statistics for a specific league/season
 */
export async function getPlayerStatistics(params: {
  player: number;
  season: number;
}): Promise<any> {
  const endpoint = `/players?id=${params.player}&season=${params.season}`;
  const response = await apiRequest<any>(endpoint);
  return response || null;
}

/**
 * Get injuries for a specific team or league
 */
export async function getInjuries(params: {
  team?: number;
  league?: number;
  date?: string; // YYYY-MM-DD
}): Promise<ApiFootballInjury[]> {
  const queryParams = new URLSearchParams();

  if (params.team) queryParams.append('team', params.team.toString());
  if (params.league) queryParams.append('league', params.league.toString());
  if (params.date) queryParams.append('date', params.date);

  const endpoint = `/injuries?${queryParams.toString()}`;
  const response = await apiRequest<ApiFootballInjury[]>(endpoint);
  return response || [];
}

/**
 * Search for leagues by name or country
 */
export async function searchLeagues(params: {
  name?: string;
  country?: string;
  type?: string; // 'league' or 'cup'
}): Promise<any[]> {
  const queryParams = new URLSearchParams();

  if (params.name) queryParams.append('name', params.name);
  if (params.country) queryParams.append('country', params.country);
  if (params.type) queryParams.append('type', params.type);

  const endpoint = `/leagues?${queryParams.toString()}`;
  const response = await apiRequest<any[]>(endpoint);
  return response || [];
}

/**
 * Search for teams by name
 */
export async function searchTeams(params: {
  name: string;
  country?: string;
}): Promise<any[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('name', params.name);
  if (params.country) queryParams.append('country', params.country);

  const endpoint = `/teams?${queryParams.toString()}`;
  const response = await apiRequest<any[]>(endpoint);
  return response || [];
}

/**
 * Get upcoming fixtures for today
 */
export async function getTodayFixtures(leagueId?: number): Promise<ApiFootballFixture[]> {
  const today = new Date().toISOString().split('T')[0];
  return getFixtures({
    date: today,
    ...(leagueId && { league: leagueId })
  });
}

/**
 * Get team form (last 5 games)
 */
export async function getTeamForm(params: {
  team: number;
  league?: number;
  season?: number;
}): Promise<ApiFootballFixture[]> {
  const fixtures = await getFixtures({
    team: params.team,
    league: params.league,
    season: params.season,
    status: 'FT', // Finished games only
  });

  // Sort by date descending and take last 5
  return fixtures
    .sort((a, b) => b.fixture.timestamp - a.fixture.timestamp)
    .slice(0, 5);
}

/**
 * Calculate team strength based on recent form and statistics
 */
export async function calculateTeamStrength(params: {
  team: number;
  league: number;
  season: number;
}): Promise<{
  overall: number; // 0-100
  home: number;
  away: number;
  attack: number;
  defense: number;
  form: number; // Based on last 5 games
}> {
  const [standings, statistics, form] = await Promise.all([
    getStandings({ league: params.league, season: params.season }),
    getTeamStatistics(params),
    getTeamForm({ team: params.team, league: params.league, season: params.season }),
  ]);

  const teamStanding = standings.find(s => s.team.id === params.team);

  // Calculate form score (W=3, D=1, L=0)
  let formScore = 0;
  for (const fixture of form) {
    const isHome = fixture.teams.home.id === params.team;
    const isWinner = isHome ? fixture.teams.home.winner : fixture.teams.away.winner;
    const isDraw = fixture.goals.home === fixture.goals.away;

    if (isWinner) formScore += 3;
    else if (isDraw) formScore += 1;
  }
  const formRating = (formScore / (form.length * 3)) * 100;

  // Calculate overall strength
  const winRate = teamStanding
    ? (teamStanding.all.win / teamStanding.all.played) * 100
    : 50;

  const homeWinRate = teamStanding
    ? (teamStanding.home.win / teamStanding.home.played) * 100
    : 50;

  const awayWinRate = teamStanding
    ? (teamStanding.away.win / teamStanding.away.played) * 100
    : 50;

  const attackRating = teamStanding
    ? Math.min(100, (teamStanding.all.goals.for / teamStanding.all.played) * 10)
    : 50;

  const defenseRating = teamStanding
    ? Math.max(0, 100 - (teamStanding.all.goals.against / teamStanding.all.played) * 10)
    : 50;

  return {
    overall: (winRate + formRating) / 2,
    home: homeWinRate,
    away: awayWinRate,
    attack: attackRating,
    defense: defenseRating,
    form: formRating,
  };
}

