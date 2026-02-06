/**
 * Data Collection Configuration
 * Centralized, hardened config for all Claude Effect data feeds
 * With validation, logging, defaults, and better key resolution
 */

import { getKeyByLabel } from '../../app/keys-store';

export interface DataFeedConfig {
  twitter: {
    enabled: boolean;
    bearerToken?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  facebook: {
    enabled: boolean;
    appId?: string;
    appSecret?: string;
  };
  instagram: {
    enabled: boolean;
  };
  news: {
    enabled: boolean;
    apiKey?: string;
    sources: string[];
  };
  pressConferences: {
    enabled: boolean;
    manualEntry: boolean;
  };
  schedule: {
    enabled: boolean;
    useOddsAPI: boolean;
  };
  roster: {
    enabled: boolean;
    useExistingData: boolean;
  };
  oddsAPI: {
    enabled: boolean;
    apiKey?: string;
    trackLineMovement: boolean;
  };
  betSplits: {
    enabled: boolean;
  };
  weather: {
    enabled: boolean;
    apiKey?: string;
    provider: 'openweather' | 'weathergov';
  };
  injuries: {
    enabled: boolean;
    useScraping: boolean;
  };
  referee: {
    enabled: boolean;
    useDatabase: boolean;
  };
}

export function loadDataFeedConfig(): DataFeedConfig {
  const log = (msg: string, level: 'warn' | 'info' = 'info') => {
    console[level === 'warn' ? 'warn' : 'log'](`[Config] ${msg}`);
  };

  // Load keys with multiple sources (env > NEXT_PUBLIC > keys-store)
  const twitterBearer = process.env.TWITTER_BEARER_TOKEN ||
                       process.env.NEXT_PUBLIC_TWITTER_BEARER_TOKEN ||
                       getKeyByLabel('Twitter Bearer Token');

  const twitterApiKey = process.env.TWITTER_API_KEY ||
                       process.env.NEXT_PUBLIC_TWITTER_API_KEY ||
                       getKeyByLabel('Twitter API Key');

  const twitterApiSecret = process.env.TWITTER_API_SECRET ||
                          process.env.NEXT_PUBLIC_TWITTER_API_SECRET ||
                          getKeyByLabel('Twitter API Secret');

  const facebookAppId = process.env.FACEBOOK_APP_ID ||
                       process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
                       getKeyByLabel('Facebook App ID');

  const facebookAppSecret = process.env.FACEBOOK_APP_SECRET ||
                           process.env.NEXT_PUBLIC_FACEBOOK_APP_SECRET ||
                           getKeyByLabel('Facebook App Secret');

  const newsApiKey = process.env.NEWS_API_KEY ||
                    process.env.NEWSAPI_KEY ||
                    getKeyByLabel('News API Key');

  const openWeatherKey = process.env.OPENWEATHER_API_KEY ||
                        process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY ||
                        getKeyByLabel('OpenWeather API Key');

  const oddsApiKey = process.env.ODDS_API_KEY ||
                    getKeyByLabel('Odds API Key');

  // Log missing critical keys
  if (!twitterBearer && !(twitterApiKey && twitterApiSecret)) {
    log('Twitter credentials missing - Twitter collection disabled', 'warn');
  }
  if (!newsApiKey) {
    log('News API key missing - News collection disabled', 'warn');
  }
  if (!openWeatherKey) {
    log('OpenWeather key missing - Weather collection disabled', 'warn');
  }
  if (!oddsApiKey) {
    log('Odds API key missing - Odds/IAI features disabled', 'warn');
  }

  return {
    twitter: {
      enabled: !!(twitterBearer || (twitterApiKey && twitterApiSecret)),
      bearerToken: twitterBearer,
      apiKey: twitterApiKey,
      apiSecret: twitterApiSecret,
    },
    facebook: {
      enabled: !!(facebookAppId && facebookAppSecret),
      appId: facebookAppId,
      appSecret: facebookAppSecret,
    },
    instagram: {
      enabled: false,
    },
    news: {
      enabled: !!newsApiKey,
      apiKey: newsApiKey,
      sources: ['ESPN', 'CBS Sports', 'Yahoo Sports', 'The Athletic'],
    },
    pressConferences: {
      enabled: true,
      manualEntry: true,
    },
    schedule: {
      enabled: true,
      useOddsAPI: !!oddsApiKey,
    },
    roster: {
      enabled: true,
      useExistingData: true,
    },
    oddsAPI: {
      enabled: !!oddsApiKey,
      apiKey: oddsApiKey,
      trackLineMovement: true,
    },
    betSplits: {
      enabled: false,
    },
    weather: {
      enabled: !!openWeatherKey,
      apiKey: openWeatherKey,
      provider: 'openweather',
    },
    injuries: {
      enabled: true,
      useScraping: true,
    },
    referee: {
      enabled: true,
      useDatabase: true,
    },
  };
}

export function getStadiumLocation(
  stadiumName: string,
  city: string,
  state: string
): {
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
} | null {
  if (!stadiumName && !city) return null;

  const stadiums: Record<string, { lat: number; lon: number }> = {
    // NFL
    'Lambeau Field': { lat: 44.5013, lon: -88.0622 },
    'Arrowhead Stadium': { lat: 39.0489, lon: -94.4839 },
    'AT&T Stadium': { lat: 32.7473, lon: -97.0945 },
    'MetLife Stadium': { lat: 40.8135, lon: -74.0745 },
    'SoFi Stadium': { lat: 33.9535, lon: -118.3390 },
    'Allegiant Stadium': { lat: 36.0908, lon: -115.1830 },
    // Add more as needed
    // NBA / MLB / NHL stadiums can be added here too
  };

  const key = stadiumName.trim();
  const coords = stadiums[key];

  if (coords) {
    return {
      name: stadiumName,
      city,
      state,
      latitude: coords.lat,
      longitude: coords.lon,
    };
  }

  // Fallback: log warning and return null (could add geocoding here later)
  console.warn(`[Config] Stadium not found: ${stadiumName} (${city}, ${state})`);
  return null;
}