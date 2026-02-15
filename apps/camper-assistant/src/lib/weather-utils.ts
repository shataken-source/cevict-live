// Weather utilities and types for camping weather data

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  visibility: number;
  uvIndex: number;
  condition: string;
  description: string;
  sunrise: string;
  sunset: string;
  precipitationChance: number;
}

export interface ForecastDay {
  date: string;
  dayName: string;
  high: number;
  low: number;
  condition: string;
  precipitationChance: number;
  windSpeed: number;
  humidity: number;
}

export interface WeatherAlert {
  type: 'storm' | 'wind' | 'flood' | 'heat' | 'cold' | 'fire';
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  title: string;
  description: string;
  startTime: string;
  endTime: string;
}

// Calculate heat index
export function calculateHeatIndex(temp: number, humidity: number): number {
  // Simplified heat index calculation
  if (temp < 80) return temp;

  const hi = -42.379 + 2.04901523 * temp + 10.14333127 * humidity
    - 0.22475541 * temp * humidity - 6.83783e-3 * temp * temp
    - 5.481717e-2 * humidity * humidity + 1.22874e-3 * temp * temp * humidity
    + 8.5282e-4 * temp * humidity * humidity - 1.99e-6 * temp * temp * humidity * humidity;

  return Math.round(hi);
}

// Calculate wind chill
export function calculateWindChill(temp: number, windSpeed: number): number {
  if (temp > 50 || windSpeed < 3) return temp;

  const wc = 35.74 + 0.6215 * temp - 35.75 * Math.pow(windSpeed, 0.16)
    + 0.4275 * temp * Math.pow(windSpeed, 0.16);

  return Math.round(wc);
}

// Get clothing recommendation based on weather
export function getClothingRecommendation(
  temp: number,
  windSpeed: number,
  rain: boolean
): string[] {
  const recommendations: string[] = [];

  if (temp < 32) {
    recommendations.push('Heavy winter layers');
    recommendations.push('Insulated boots');
  } else if (temp < 50) {
    recommendations.push('Fleece or light down jacket');
    recommendations.push('Long pants');
  } else if (temp < 70) {
    recommendations.push('Light jacket or hoodie');
    recommendations.push('Long pants or jeans');
  } else {
    recommendations.push('T-shirt and shorts OK');
    recommendations.push('Sun protection');
  }

  if (windSpeed > 15) {
    recommendations.push('Windbreaker layer');
  }

  if (rain) {
    recommendations.push('Rain jacket essential');
    recommendations.push('Waterproof boots');
  }

  return recommendations;
}

// Check if conditions are good for outdoor activities
export function isGoodForCamping(weather: WeatherData): {
  good: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let good = true;

  if (weather.precipitationChance > 70) {
    reasons.push('High chance of rain');
    good = false;
  }

  if (weather.windSpeed > 25) {
    reasons.push('Strong winds expected');
    good = false;
  }

  if (weather.temperature < 20 || weather.temperature > 95) {
    reasons.push('Extreme temperatures');
    good = false;
  }

  if (good) {
    reasons.push('Conditions look great!');
  }

  return { good, reasons };
}
