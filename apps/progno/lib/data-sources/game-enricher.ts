// lib/data-sources/game-enricher.ts

import teamStatsFetcher from './team-stats-fetcher';
import { getTeamInjuries, calculateInjuryImpact } from './injury-fetcher';

// Stub for weather
const WeatherCollector = {
  async getWeatherForStadium(location: any, date: any) {
    console.log('[Weather] Stub weather data');
    return {
      temperature: 68,
      conditions: 'clear',
      windSpeed: 5,
      windGusts: 10,
      precipitationType: 'none',
      humidity: 60,
      visibility: 10,
      timestamp: new Date().toISOString()
    };
  }
};

// Cache + re-entrancy guard
const enrichCache = new Map<string, any>();
const enriching = new Set<string>();

export async function enrichGame(game: any): Promise<any> {
  if (!game?.id) {
    console.warn('[EnrichGame] Invalid game object');
    return game;
  }

  const cacheKey = `enrich-${game.id}`;

  if (enrichCache.has(cacheKey)) {
    console.debug(`[EnrichGame] Cache hit for ${game.id}`);
    return enrichCache.get(cacheKey);
  }

  if (enriching.has(cacheKey)) {
    console.warn(`[EnrichGame] Re-entrancy detected for ${game.id}`);
    return game;
  }

  enriching.add(cacheKey);

  try {
    let gameDate = game.date;
    if (typeof gameDate === 'string') {
      gameDate = new Date(gameDate);
    }
    if (!(gameDate instanceof Date) || isNaN(gameDate.getTime())) {
      gameDate = new Date();
    }

    // Team stats
    const homeStats = await teamStatsFetcher.getTeamStats(game.homeTeam, game.sport);
    const awayStats = await teamStatsFetcher.getTeamStats(game.awayTeam, game.sport);

    game.homeStats = homeStats;
    game.awayStats = awayStats;

    // Injuries
    const homeInjuries = await getTeamInjuries(game.sport, game.homeTeam);
    const awayInjuries = await getTeamInjuries(game.sport, game.awayTeam);

    game.injuries = {
      homeInjuries,
      awayInjuries,
      homeImpact: await calculateInjuryImpact(game.sport, game.homeTeam),
      awayImpact: await calculateInjuryImpact(game.sport, game.awayTeam),
    };

    // Weather
    if (game.venue) {
      const location = { name: game.venue, city: 'Unknown', state: 'Unknown', latitude: 0, longitude: 0 };
      const weather = await WeatherCollector.getWeatherForStadium(location, gameDate);
      game.weather = weather;
    }

    enrichCache.set(cacheKey, game);
    return game;
  } catch (error: any) {
    console.error(`[EnrichGame] Failed for ${game.id}: ${error.message}`);
    return game;
  } finally {
    enriching.delete(cacheKey);
  }
}