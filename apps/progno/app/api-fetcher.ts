/// app/api-fetcher.ts
// STRICT LIVE DATA MODE: All Mock Data Generation has been removed.

export interface GameResult {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'final' | 'in_progress' | 'scheduled';
  startTime: Date;
  endTime?: Date;
  venue: string;
  weather?: {
    temperature: number;
    conditions: string;
    windSpeed: number;
  };
}

export interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: Date;
}

export interface GameStats {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeStats: any;
  awayStats: any;
}

// ---------------------------------------------------------
// CRITICAL: LIVE DATA ENFORCEMENT
// ---------------------------------------------------------

// Helper to enforce live data
function enforceLiveData(feature: string) {
  throw new Error(`LIVE DATA REQUIRED: Mock data for '${feature}' has been disabled. You must implement the real API call.`);
}

export async function fetchMultipleGameResults(gameIds: string[]): Promise<GameResult[]> {
  // TODO: Connect to Real API (e.g., TheOddsAPI, ESPN, API-Football)
  enforceLiveData("fetchMultipleGameResults");
  return []; // Unreachable
}

export async function fetchGameResult(gameId: string): Promise<GameResult | null> {
  // TODO: Connect to Real API
  enforceLiveData("fetchGameResult");
  return null;
}

export async function fetchLiveGameUpdates(gameIds: string[]): Promise<GameResult[]> {
  // TODO: Connect to Real API
  enforceLiveData("fetchLiveGameUpdates");
  return [];
}

export async function fetchGameStats(gameId: string): Promise<GameStats | null> {
  // TODO: Connect to Real API
  enforceLiveData("fetchGameStats");
  return null;
}

export async function fetchHistoricalResults(
  team?: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 50
): Promise<GameResult[]> {
  // TODO: Connect to Real API
  enforceLiveData("fetchHistoricalResults");
  return [];
}

export async function fetchFromAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  // TODO: Connect to Real API
  // This was previously generating fake data. Now it strictly fails.
  try {
     // PLACEHOLDER: Insert actual fetch() call here
     // const res = await fetch(endpoint, options);
     // return await res.json();
     
     enforceLiveData(`Generic API Fetch: ${endpoint}`);
     return { success: false, data: {} as T, timestamp: new Date() }; // Unreachable
  } catch (error) {
    return {
      data: {} as T,
      success: false,
      message: error instanceof Error ? error.message : 'Live Data Error',
      timestamp: new Date()
    };
  }
}

// Cache management (Preserved because it is useful for real data)
class APICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new APICache();

export async function fetchFromAPIWithCache<T>(
  endpoint: string,
  options: RequestInit = {},
  cacheKey?: string,
  ttl: number = 300000
): Promise<APIResponse<T>> {
  const key = cacheKey || endpoint;
  const cached = apiCache.get(key);
  if (cached) return { data: cached, success: true, timestamp: new Date() };

  const response = await fetchFromAPI<T>(endpoint, options);
  if (response.success) apiCache.set(key, response.data, ttl);
  return response;
}