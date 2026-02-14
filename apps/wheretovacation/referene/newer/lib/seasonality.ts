// Seasonality data and utilities for destinations

export interface SeasonalityData {
  destinationId: string;
  name: string;
  bestMonths: number[];
  shoulderMonths: number[];
  offSeasonMonths: number[];
  weatherPattern: {
    summer: { temp: number, humidity: number, rainfall: number };
    winter: { temp: number, humidity: number, rainfall: number };
    spring: { temp: number, humidity: number, rainfall: number };
    fall: { temp: number, humidity: number, rainfall: number };
  };
  crowdPattern: {
    peak: number[];
    high: number[];
    low: number[];
  };
  pricing: {
    peak: number; // multiplier
    shoulder: number; // multiplier
    offSeason: number; // multiplier
  };
  events: Array<{
    month: number;
    name: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

// Seasonality database - in production this would come from API/database
export const seasonalityData: Record<string, SeasonalityData> = {
  'costa-rica': {
    destinationId: 'costa-rica',
    name: 'Costa Rica',
    bestMonths: [12, 1, 2, 3], // Dry season
    shoulderMonths: [4, 5, 11], // Transition periods
    offSeasonMonths: [6, 7, 8, 9, 10], // Rainy season
    weatherPattern: {
      summer: { temp: 75, humidity: 85, rainfall: 8 }, // Jun-Aug
      winter: { temp: 80, humidity: 75, rainfall: 1 }, // Dec-Feb
      spring: { temp: 78, humidity: 80, rainfall: 3 }, // Mar-May
      fall: { temp: 77, humidity: 82, rainfall: 6 }, // Sep-Nov
    },
    crowdPattern: {
      peak: [12, 1, 2, 7, 8], // Winter & summer vacation
      high: [3, 4, 11], // Spring break & Thanksgiving
      low: [5, 6, 9, 10], // Shoulder seasons
    },
    pricing: {
      peak: 1.5,
      shoulder: 1.2,
      offSeason: 0.8,
    },
    events: [
      { month: 12, name: 'Christmas & New Year', impact: 'high' },
      { month: 3, name: 'Spring Break', impact: 'medium' },
      { month: 7, name: 'Summer Vacation', impact: 'high' },
    ],
  },
  'hawaii': {
    destinationId: 'hawaii',
    name: 'Hawaii',
    bestMonths: [4, 5, 9, 10, 11], // Shoulder seasons with great weather
    shoulderMonths: [3, 6, 12, 1, 2], // Good but more crowded/expensive
    offSeasonMonths: [7, 8], // Hottest, most crowded
    weatherPattern: {
      summer: { temp: 85, humidity: 75, rainfall: 2 }, // Jun-Aug
      winter: { temp: 78, humidity: 70, rainfall: 3 }, // Dec-Feb
      spring: { temp: 80, humidity: 72, rainfall: 2 }, // Mar-May
      fall: { temp: 83, humidity: 73, rainfall: 2 }, // Sep-Nov
    },
    crowdPattern: {
      peak: [12, 6, 7, 8], // Holidays & summer
      high: [3, 11, 1, 2], // Spring break, Thanksgiving, winter
      low: [4, 5, 9, 10], // Best time to visit
    },
    pricing: {
      peak: 1.8,
      shoulder: 1.3,
      offSeason: 1.0,
    },
    events: [
      { month: 12, name: 'Christmas & New Year', impact: 'high' },
      { month: 3, name: 'Spring Break', impact: 'high' },
      { month: 8, name: 'Summer Peak', impact: 'medium' },
    ],
  },
  'colorado': {
    destinationId: 'colorado',
    name: 'Colorado',
    bestMonths: [6, 7, 8, 9, 12, 1, 2], // Summer hiking & winter skiing
    shoulderMonths: [4, 5, 10, 11], // Spring & fall
    offSeasonMonths: [3], // Mud season
    weatherPattern: {
      summer: { temp: 75, humidity: 40, rainfall: 2 }, // Jun-Aug
      winter: { temp: 30, humidity: 50, rainfall: 1 }, // Dec-Feb
      spring: { temp: 55, humidity: 45, rainfall: 2 }, // Mar-May
      fall: { temp: 60, humidity: 40, rainfall: 1 }, // Sep-Nov
    },
    crowdPattern: {
      peak: [7, 8, 12, 1, 2], // Summer & winter holidays
      high: [6, 9, 10, 3], // Shoulders
      low: [4, 5, 11], // Off-peak
    },
    pricing: {
      peak: 1.6,
      shoulder: 1.2,
      offSeason: 0.9,
    },
    events: [
      { month: 1, name: 'Ski Season Peak', impact: 'high' },
      { month: 7, name: 'Summer Vacation', impact: 'high' },
      { month: 10, name: 'Fall Colors', impact: 'medium' },
    ],
  },
  'thailand': {
    destinationId: 'thailand',
    name: 'Thailand',
    bestMonths: [11, 12, 1, 2], // Cool, dry season
    shoulderMonths: [3, 4, 10], // Transition periods
    offSeasonMonths: [5, 6, 7, 8, 9], // Monsoon season
    weatherPattern: {
      summer: { temp: 90, humidity: 85, rainfall: 10 }, // Jun-Aug (monsoon)
      winter: { temp: 85, humidity: 60, rainfall: 1 }, // Dec-Feb (cool season)
      spring: { temp: 88, humidity: 70, rainfall: 3 }, // Mar-May (hot season)
      fall: { temp: 85, humidity: 75, rainfall: 8 }, // Sep-Nov
    },
    crowdPattern: {
      peak: [12, 1, 2, 7, 8], // Cool season & summer
      high: [11, 3, 10], // Shoulder months
      low: [4, 5, 6, 9], // Monsoon season
    },
    pricing: {
      peak: 1.4,
      shoulder: 1.1,
      offSeason: 0.7,
    },
    events: [
      { month: 11, name: 'Loy Krathong', impact: 'medium' },
      { month: 12, name: 'New Year & Christmas', impact: 'high' },
      { month: 4, name: 'Songkran', impact: 'high' },
    ],
  },
};

// Utility functions
export function getSeasonalityInfo(destinationId: string, month?: number): SeasonalityData | null {
  const data = seasonalityData[destinationId];
  if (!data) return null;
  
  const targetMonth = month || new Date().getMonth() + 1;
  return {
    ...data,
    currentMonth: targetMonth,
  } as SeasonalityData & { currentMonth: number };
}

export function getMonthQuality(data: SeasonalityData, month: number): 'best' | 'shoulder' | 'off' {
  if (data.bestMonths.includes(month)) return 'best';
  if (data.shoulderMonths.includes(month)) return 'shoulder';
  return 'off';
}

export function getCrowdLevel(data: SeasonalityData, month: number): 'peak' | 'high' | 'low' {
  if (data.crowdPattern.peak.includes(month)) return 'peak';
  if (data.crowdPattern.high.includes(month)) return 'high';
  return 'low';
}

export function getPriceMultiplier(data: SeasonalityData, month: number): number {
  const quality = getMonthQuality(data, month);
  switch (quality) {
    case 'best': return data.pricing.peak;
    case 'shoulder': return data.pricing.shoulder;
    case 'off': return data.pricing.offSeason;
    default: return 1;
  }
}

export function getSeasonalRecommendation(data: SeasonalityData, month: number): {
  recommendation: string;
  reasoning: string;
  savings: string;
} {
  const quality = getMonthQuality(data, month);
  const crowd = getCrowdLevel(data, month);
  const weather = getWeatherForMonth(data, month);
  
  switch (quality) {
    case 'best':
      return {
        recommendation: 'Excellent Time to Visit',
        reasoning: `${data.name} is in peak season with ideal weather conditions (${weather.temp}°F, low rainfall).`,
        savings: 'Premium pricing due to high demand.',
      };
    case 'shoulder':
      return {
        recommendation: 'Great Value Opportunity',
        reasoning: `Enjoy pleasant weather (${weather.temp}°F) with fewer crowds than peak season.`,
        savings: `Save ~${Math.round((1 - data.pricing.shoulder / data.pricing.peak) * 100)}% compared to peak season.`,
      };
    case 'off':
      return {
        recommendation: 'Budget-Friendly Option',
        reasoning: `Experience ${data.name} like a local with authentic atmosphere and great deals.`,
        savings: `Save up to ~${Math.round((1 - data.pricing.offSeason / data.pricing.peak) * 100)}% compared to peak season.`,
      };
    default:
      return {
        recommendation: 'Consider Different Time',
        reasoning: 'Weather conditions may not be ideal for outdoor activities.',
        savings: 'Lowest prices of the year.',
      };
  }
}

export function getWeatherForMonth(data: SeasonalityData, month: number): {
  temp: number;
  humidity: number;
  rainfall: number;
  description: string;
  season: string;
} {
  let weather = data.weatherPattern.summer;
  let season = 'summer';
  
  if ([12, 1, 2].includes(month)) {
    weather = data.weatherPattern.winter;
    season = 'winter';
  } else if ([3, 4, 5].includes(month)) {
    weather = data.weatherPattern.spring;
    season = 'spring';
  } else if ([9, 10, 11].includes(month)) {
    weather = data.weatherPattern.fall;
    season = 'fall';
  }
  
  const description = weather.rainfall > 6 ? 'Rainy' : 
                     weather.temp > 85 ? 'Hot' : 
                     weather.temp < 50 ? 'Cold' : 
                     weather.humidity > 80 ? 'Humid' : 'Pleasant';
  
  return { ...weather, description, season };
}

export function getEventsForMonth(data: SeasonalityData, month: number) {
  return data.events.filter(event => event.month === month);
}
