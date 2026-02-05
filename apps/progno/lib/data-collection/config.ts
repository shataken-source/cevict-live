/**
 * Data Collection Configuration
 * Centralized config for all Claude Effect data feeds
 */

import { getKeyByLabel } from '../../app/keys-store';

export interface DataFeedConfig {
  // Phase 1: Sentiment Field
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
    // Would use Instagram Basic Display API or scraping
  };
  news: {
    enabled: boolean;
    apiKey?: string;
    sources: string[];
  };
  pressConferences: {
    enabled: boolean;
    manualEntry: boolean; // For Phase 1, allow manual entry
  };

  // Phase 2: Narrative Momentum
  schedule: {
    enabled: boolean;
    useOddsAPI: boolean; // Use existing Odds API for schedule
  };
  roster: {
    enabled: boolean;
    useExistingData: boolean;
  };

  // Phase 3: Information Asymmetry Index
  oddsAPI: {
    enabled: boolean;
    apiKey?: string;
    trackLineMovement: boolean;
  };
  betSplits: {
    enabled: boolean;
    // Would use Action Network, VSiN, or other sources
  };

  // Phase 4: Chaos Sensitivity Index
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

/**
 * Load data feed configuration from environment and keys store
 */
export function loadDataFeedConfig(): DataFeedConfig {
  // Load API keys from environment or keys store
  // Twitter keys found in WINDOWS-SETUP.md and MASTER_ENV_CONFIG.env
  const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN ||
                            process.env.NEXT_PUBLIC_TWITTER_BEARER_TOKEN ||
                            getKeyByLabel('Twitter Bearer Token');
  const twitterApiKey = process.env.TWITTER_API_KEY ||
                       process.env.NEXT_PUBLIC_TWITTER_API_KEY ||
                       getKeyByLabel('Twitter API Key');
  const twitterApiSecret = process.env.TWITTER_API_SECRET ||
                          process.env.NEXT_PUBLIC_TWITTER_API_SECRET ||
                          getKeyByLabel('Twitter API Secret');

  // Facebook keys found in MASTER_ENV_CONFIG.env
  const facebookAppId = process.env.FACEBOOK_APP_ID ||
                       process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
                       getKeyByLabel('Facebook App ID');
  const facebookAppSecret = process.env.FACEBOOK_APP_SECRET ||
                            process.env.NEXT_PUBLIC_FACEBOOK_APP_SECRET ||
                            getKeyByLabel('Facebook App Secret');

  // News API key provided by user
  const newsApiKey = process.env.NEWS_API_KEY ||
                    process.env.NEWSAPI_KEY ||
                    getKeyByLabel('News API Key');

  // OpenWeather key found in ENV_VARS_CHECKLIST.md
  const openWeatherKey = process.env.OPENWEATHER_API_KEY ||
                        process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY ||
                        getKeyByLabel('OpenWeather API Key');

  const oddsApiKey = process.env.ODDS_API_KEY ||
                    getKeyByLabel('Odds API Key');

  return {
    twitter: {
      enabled: !!(twitterBearerToken || (twitterApiKey && twitterApiSecret)),
      bearerToken: twitterBearerToken,
      apiKey: twitterApiKey,
      apiSecret: twitterApiSecret,
    },
    facebook: {
      enabled: !!(facebookAppId && facebookAppSecret),
      appId: facebookAppId,
      appSecret: facebookAppSecret,
    },
    instagram: {
      enabled: false, // Phase 2
    },
    news: {
      enabled: !!newsApiKey,
      apiKey: newsApiKey,
      sources: ['ESPN', 'CBS Sports', 'Yahoo Sports'],
    },
    pressConferences: {
      enabled: true,
      manualEntry: true, // Allow manual entry for now
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
      enabled: false, // Would need Action Network or similar
    },
    weather: {
      enabled: !!openWeatherKey,
      apiKey: openWeatherKey,
      provider: 'openweather',
    },
    injuries: {
      enabled: true,
      useScraping: true, // Would scrape from official sources
    },
    referee: {
      enabled: true,
      useDatabase: true, // Use internal database
    },
  };
}

/**
 * Get stadium locations for weather collection
 */
export function getStadiumLocation(stadiumName: string, city: string, state: string): {
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
} | null {
  // Common stadium coordinates (would be in database in production)
  const stadiums: Record<string, { lat: number; lon: number }> = {
    // NFL Stadiums
    'Lambeau Field': { lat: 44.5013, lon: -88.0622 },
    'Arrowhead Stadium': { lat: 39.0489, lon: -94.4839 },
    'AT&T Stadium': { lat: 32.7473, lon: -97.0945 },
    'MetLife Stadium': { lat: 40.8135, lon: -74.0745 },
    // Add more as needed
  };

  const key = stadiumName || `${city} Stadium`;
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

  // Fallback: Would use geocoding API
  return null;
}

