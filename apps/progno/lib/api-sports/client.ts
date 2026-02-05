/**
 * API-SPORTS Client Library
 * Complete implementation with logging, rate limiting, and all endpoints
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios'

// Lazy-load Supabase to avoid build-time issues
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

interface ApiSportsConfig {
  sport: 'nba' | 'nfl' | 'nhl' | 'ncaaf' | 'ncaab'
  apiKey: string
  host: string
}

interface RequestMetadata {
  startTime: number
  endTime?: number
}

interface ApiSportsResponse<T> {
  get: string
  parameters: Record<string, string>
  errors: string[]
  results: number
  response: T
}

export interface Team {
  id: number
  name: string
  code: string
  logo: string
  city?: string
  country?: string
  founded?: number
}

export interface Player {
  id: number
  name: string
  firstname?: string
  lastname?: string
  birth?: { date: string; country: string }
  height?: { meters: string }
  weight?: { kilograms: string }
  photo?: string
}

export interface Injury {
  player: { id: number; name: string }
  team: { id: number; name: string }
  type: string
  reason: string
  status: string
  date: string
}

export interface Game {
  id: number
  date: string
  time: string
  timestamp: number
  timezone: string
  status: {
    long: string
    short: string
    timer?: string
  }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  scores: {
    home: { total: number }
    away: { total: number }
  }
  periods?: { current: number; total: number }
}

export interface Standing {
  team: { id: number; name: string; logo: string }
  position: number
  won: number
  lost: number
  points: { for: number; against: number }
  streak?: string
  conference?: { name: string; rank: number }
  division?: { name: string; rank: number }
}

export interface Odds {
  id: number
  bookmaker: {
    id: number
    name: string
  }
  bets: Array<{
    id: number
    name: string
    values: Array<{
      value: string
      odd: string
    }>
  }>
}

export class ApiSportsClient {
  private client: AxiosInstance
  private sport: string
  private requestCount: number = 0
  private lastReset: Date = new Date()
  private rateLimit: number

  constructor(config: ApiSportsConfig) {
    this.sport = config.sport
    this.rateLimit = parseInt(process.env.API_SPORTS_RATE_LIMIT || '100')
    
    this.client = axios.create({
      baseURL: `https://${config.host}`,
      headers: {
        'x-rapidapi-key': config.apiKey,
        'x-rapidapi-host': config.host
      },
      timeout: 15000
    })

    // Request interceptor - add timing
    this.client.interceptors.request.use((config) => {
      (config as any).metadata = { startTime: Date.now() } as RequestMetadata
      return config
    })

    // Response interceptor - log and track rate limits
    this.client.interceptors.response.use(
      async (response) => {
        await this.logRequest(response)
        return response
      },
      async (error) => {
        await this.logError(error)
        throw error
      }
    )
  }

  private async logRequest(response: AxiosResponse) {
    const metadata = (response.config as any).metadata as RequestMetadata
    const responseTime = Date.now() - metadata.startTime
    const rateLimitRemaining = response.headers['x-ratelimit-requests-remaining']
    
    const supabase = getSupabase()
    if (supabase) {
      await supabase.from('api_request_log').insert({
        api_name: 'api-sports',
        endpoint: response.config.url,
        status_code: response.status,
        response_time_ms: responseTime,
        rate_limit_remaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : null
      }).catch(() => {}) // Silent fail for logging
    }

    this.requestCount++
    console.log(`[API-SPORTS] ${response.config.url} - ${response.status} (${responseTime}ms) - Remaining: ${rateLimitRemaining}`)
  }

  private async logError(error: any) {
    const supabase = getSupabase()
    if (supabase) {
      await supabase.from('api_request_log').insert({
        api_name: 'api-sports',
        endpoint: error.config?.url || 'unknown',
        status_code: error.response?.status || 0,
        error_message: error.message
      }).catch(() => {})
    }

    console.error(`[API-SPORTS ERROR] ${error.config?.url} - ${error.message}`)
  }

  private checkRateLimit(): boolean {
    const now = new Date()
    const hoursSinceReset = (now.getTime() - this.lastReset.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceReset >= 24) {
      this.requestCount = 0
      this.lastReset = now
    }
    
    return this.requestCount < this.rateLimit
  }

  // ============================================
  // TEAMS
  // ============================================

  async getTeams(league: string, season: number): Promise<Team[]> {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get<ApiSportsResponse<Array<{ team: Team }>>>('/teams', {
      params: { league, season }
    })
    return response.data.response.map(r => r.team)
  }

  async getTeam(teamId: number): Promise<Team | null> {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get<ApiSportsResponse<Array<{ team: Team }>>>('/teams', {
      params: { id: teamId }
    })
    return response.data.response[0]?.team || null
  }

  // ============================================
  // PLAYERS
  // ============================================

  async getPlayers(teamId: number, season: number): Promise<Player[]> {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get<ApiSportsResponse<Player[]>>('/players', {
      params: { team: teamId, season }
    })
    return response.data.response
  }

  async getPlayerStats(playerId: number, season: number) {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get('/players/statistics', {
      params: { id: playerId, season }
    })
    return response.data.response
  }

  // ============================================
  // GAMES / FIXTURES
  // ============================================

  async getGames(params: {
    league?: string
    season?: number
    date?: string
    team?: number
    timezone?: string
    live?: string
  }): Promise<Game[]> {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get<ApiSportsResponse<Game[]>>('/games', {
      params: {
        ...params,
        timezone: params.timezone || 'America/New_York'
      }
    })
    return response.data.response
  }

  async getGame(gameId: number): Promise<Game | null> {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get<ApiSportsResponse<Game[]>>('/games', {
      params: { id: gameId }
    })
    return response.data.response[0] || null
  }

  async getLiveGames(): Promise<Game[]> {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get<ApiSportsResponse<Game[]>>('/games', {
      params: { live: 'all' }
    })
    return response.data.response
  }

  async getGameLineups(gameId: number) {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get('/games/lineups', {
      params: { id: gameId }
    })
    return response.data.response
  }

  async getGameStatistics(gameId: number) {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get('/games/statistics', {
      params: { id: gameId }
    })
    return response.data.response
  }

  // ============================================
  // INJURIES
  // ============================================

  async getInjuries(params: {
    league?: string
    season?: number
    team?: number
    date?: string
  }): Promise<Injury[]> {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get<ApiSportsResponse<Injury[]>>('/injuries', {
      params
    })
    return response.data.response
  }

  // ============================================
  // STANDINGS
  // ============================================

  async getStandings(league: string, season: number): Promise<Standing[]> {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get<ApiSportsResponse<Standing[][]>>('/standings', {
      params: { league, season }
    })
    // Flatten if nested
    const standings = response.data.response
    return Array.isArray(standings[0]) ? standings.flat() : standings as unknown as Standing[]
  }

  // ============================================
  // ODDS
  // ============================================

  async getOdds(params: {
    league?: string
    season?: number
    game?: number
    bookmaker?: string
  }): Promise<Odds[]> {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get<ApiSportsResponse<Array<{ bookmakers: Odds[] }>>>('/odds', {
      params
    })
    return response.data.response.flatMap(r => r.bookmakers)
  }

  // ============================================
  // HEAD-TO-HEAD
  // ============================================

  async getH2H(team1: number, team2: number): Promise<Game[]> {
    if (!this.checkRateLimit()) throw new Error('Rate limit exceeded')
    
    const response = await this.client.get<ApiSportsResponse<Game[]>>('/games/h2h', {
      params: { h2h: `${team1}-${team2}` }
    })
    return response.data.response
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getRequestCount(): number {
    return this.requestCount
  }

  getRemainingRequests(): number {
    return Math.max(0, this.rateLimit - this.requestCount)
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createNBAClient(): ApiSportsClient {
  return new ApiSportsClient({
    sport: 'nba',
    apiKey: process.env.API_SPORTS_KEY || '',
    host: process.env.API_SPORTS_NBA_HOST || 'v1.basketball.api-sports.io'
  })
}

export function createNFLClient(): ApiSportsClient {
  return new ApiSportsClient({
    sport: 'nfl',
    apiKey: process.env.API_SPORTS_KEY || '',
    host: process.env.API_SPORTS_NFL_HOST || 'v1.american-football.api-sports.io'
  })
}

export function createNHLClient(): ApiSportsClient {
  return new ApiSportsClient({
    sport: 'nhl',
    apiKey: process.env.API_SPORTS_KEY || '',
    host: process.env.API_SPORTS_NHL_HOST || 'v1.hockey.api-sports.io'
  })
}

export function createNCAAFClient(): ApiSportsClient {
  return new ApiSportsClient({
    sport: 'ncaaf',
    apiKey: process.env.API_SPORTS_KEY || '',
    host: process.env.API_SPORTS_NCAAF_HOST || 'v1.american-football.api-sports.io'
  })
}

export function createNCAABClient(): ApiSportsClient {
  return new ApiSportsClient({
    sport: 'ncaab',
    apiKey: process.env.API_SPORTS_KEY || '',
    host: process.env.API_SPORTS_NCAAB_HOST || 'v1.basketball.api-sports.io'
  })
}

// League IDs for each sport
export const LEAGUE_IDS = {
  nba: '12',      // NBA
  nfl: '1',       // NFL
  nhl: '57',      // NHL
  ncaaf: '8',     // NCAA Football
  ncaab: '116'    // NCAA Basketball
}

export function getClientForSport(sport: string): ApiSportsClient | null {
  const sportLower = sport.toLowerCase()
  
  switch (sportLower) {
    case 'nba':
    case 'basketball_nba':
      return createNBAClient()
    case 'nfl':
    case 'americanfootball_nfl':
      return createNFLClient()
    case 'nhl':
    case 'icehockey_nhl':
      return createNHLClient()
    case 'ncaaf':
    case 'cfb':
    case 'americanfootball_ncaaf':
      return createNCAAFClient()
    case 'ncaab':
    case 'cbb':
    case 'basketball_ncaab':
      return createNCAABClient()
    default:
      return null
  }
}

export function getLeagueId(sport: string): string | null {
  const sportLower = sport.toLowerCase()
  
  switch (sportLower) {
    case 'nba':
    case 'basketball_nba':
      return LEAGUE_IDS.nba
    case 'nfl':
    case 'americanfootball_nfl':
      return LEAGUE_IDS.nfl
    case 'nhl':
    case 'icehockey_nhl':
      return LEAGUE_IDS.nhl
    case 'ncaaf':
    case 'cfb':
    case 'americanfootball_ncaaf':
      return LEAGUE_IDS.ncaaf
    case 'ncaab':
    case 'cbb':
    case 'basketball_ncaab':
      return LEAGUE_IDS.ncaab
    default:
      return null
  }
}

