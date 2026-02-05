// Shared Weather Service Module for Progno Sports Prediction Platform

export interface WeatherPrediction {
  date: Date;
  temperature: number;
  conditions: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  pressure: number;
  confidence: number;
}

export interface WeatherAlert {
  type: 'severe' | 'warning' | 'watch' | 'advisory';
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  severity: 'low' | 'medium' | 'high' | 'extreme';
}

export interface ExtendedWeatherForecast {
  location: string;
  predictions: WeatherPrediction[];
  alerts: WeatherAlert[];
  summary: {
    averageTemp: number;
    precipitationDays: number;
    severeWeatherDays: number;
    bestDays: string[];
  };
}

// Get weather predictions for multiple days
export async function getWeatherPredictions(
  location: string,
  days: number = 7
): Promise<ExtendedWeatherForecast> {
  const predictions = generateWeatherPredictions(location, days);
  const alerts = generateWeatherAlerts(location, days);
  const summary = generateWeatherSummary(predictions, alerts);

  return {
    location,
    predictions,
    alerts,
    summary
  };
}

// Generate weather predictions
function generateWeatherPredictions(location: string, days: number): WeatherPrediction[] {
  const predictions: WeatherPrediction[] = [];
  const baseTemp = getBaseTemperature(location);

  for (let day = 0; day < days; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);

    // Add seasonal variation
    const seasonalVariation = Math.sin((date.getMonth() - 3) * Math.PI / 6) * 15;
    const dailyVariation = Math.sin(day * 0.5) * 8;
    const randomVariation = (Math.random() - 0.5) * 5;

    const temperature = baseTemp + seasonalVariation + dailyVariation + randomVariation;

    predictions.push({
      date,
      temperature: Math.round(temperature * 10) / 10,
      conditions: getRandomWeatherConditions(temperature),
      precipitation: Math.random() * 100,
      windSpeed: Math.round(5 + Math.random() * 20),
      humidity: Math.round(40 + Math.random() * 50),
      pressure: Math.round(1000 + Math.random() * 40 - 20),
      confidence: Math.max(0.3, Math.min(0.95, 0.9 - (day * 0.05)))
    });
  }

  return predictions;
}

// Get base temperature for location
function getBaseTemperature(location: string): number {
  const locationTemps: { [key: string]: number } = {
    'panama city, fl': 75,
    'destin, fl': 74,
    'pensacola, fl': 73,
    'mobile, al': 72,
    'new orleans, la': 76,
    'houston, tx': 78,
    'tampa, fl': 77,
    'miami, fl': 82,
    'atlanta, ga': 68,
    'nashville, tn': 65,
    'dallas, tx': 77,
    'austin, tx': 79,
    'chicago, il': 55,
    'new york, ny': 58,
    'boston, ma': 54,
    'los angeles, ca': 72,
    'san francisco, ca': 65,
    'seattle, wa': 58
  };

  const normalizedLocation = location.toLowerCase().trim();
  return locationTemps[normalizedLocation] || 70;
}

// Get random weather conditions based on temperature
function getRandomWeatherConditions(temperature: number): string {
  const conditions = temperature > 80
    ? ['Sunny', 'Partly Cloudy', 'Hot', 'Humid']
    : temperature > 60
    ? ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain']
    : temperature > 40
    ? ['Cloudy', 'Light Rain', 'Overcast', 'Drizzle']
    : ['Snow', 'Freezing Rain', 'Blizzard', 'Overcast'];

  return conditions[Math.floor(Math.random() * conditions.length)];
}

// Generate weather alerts
function generateWeatherAlerts(location: string, days: number): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const alertChance = 0.2; // 20% chance of alert per day

  for (let day = 0; day < days; day++) {
    if (Math.random() < alertChance) {
      const date = new Date();
      date.setDate(date.getDate() + day);

      const alertTypes = [
        { type: 'severe' as const, severity: 'extreme' as const, title: 'Severe Thunderstorm Warning' },
        { type: 'warning' as const, severity: 'high' as const, title: 'Flash Flood Warning' },
        { type: 'watch' as const, severity: 'medium' as const, title: 'Tornado Watch' },
        { type: 'advisory' as const, severity: 'low' as const, title: 'Heat Advisory' }
      ];

      const selectedAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)];

      alerts.push({
        ...selectedAlert,
        description: generateAlertDescription(selectedAlert.title),
        startTime: new Date(date.getTime() + Math.random() * 12 * 60 * 60 * 1000),
        endTime: new Date(date.getTime() + (12 + Math.random() * 12) * 60 * 60 * 1000)
      });
    }
  }

  return alerts;
}

// Generate alert description
function generateAlertDescription(title: string): string {
  const descriptions: { [key: string]: string } = {
    'Severe Thunderstorm Warning': 'Dangerous thunderstorms with damaging winds and large hail expected',
    'Flash Flood Warning': 'Rapid flooding possible in low-lying areas and near waterways',
    'Tornado Watch': 'Conditions favorable for tornado development - monitor weather closely',
    'Heat Advisory': 'High temperatures and humidity may cause heat-related illnesses'
  };

  return descriptions[title] || 'Severe weather conditions expected - take precautions';
}

// Generate weather summary
function generateWeatherSummary(predictions: WeatherPrediction[], alerts: WeatherAlert[]): {
  averageTemp: number;
  precipitationDays: number;
  severeWeatherDays: number;
  bestDays: string[];
} {
  const averageTemp = predictions.reduce((sum, p) => sum + p.temperature, 0) / predictions.length;
  const precipitationDays = predictions.filter(p => p.precipitation > 30).length;
  const severeWeatherDays = alerts.length;

  const bestDays = predictions
    .filter(p => p.temperature >= 65 && p.temperature <= 85 && p.precipitation < 20)
    .slice(0, 3)
    .map(p => p.date.toDateString());

  return {
    averageTemp: Math.round(averageTemp * 10) / 10,
    precipitationDays,
    severeWeatherDays,
    bestDays
  };
}

// Get current weather conditions
export async function getCurrentWeather(location: string): Promise<WeatherPrediction> {
  const baseTemp = getBaseTemperature(location);
  const currentVariation = (Math.random() - 0.5) * 10;

  return {
    date: new Date(),
    temperature: Math.round((baseTemp + currentVariation) * 10) / 10,
    conditions: getRandomWeatherConditions(baseTemp + currentVariation),
    precipitation: Math.random() * 100,
    windSpeed: Math.round(5 + Math.random() * 15),
    humidity: Math.round(40 + Math.random() * 50),
    pressure: Math.round(1000 + Math.random() * 40 - 20),
    confidence: 0.95
  };
}

// Get weather impact on activities
export function getWeatherImpact(conditions: string, precipitation: number, windSpeed: number): {
  outdoorActivities: 'excellent' | 'good' | 'fair' | 'poor';
  sports: 'excellent' | 'good' | 'fair' | 'poor';
  fishing: 'excellent' | 'good' | 'fair' | 'poor';
  travel: 'excellent' | 'good' | 'fair' | 'poor';
} {
  let outdoorScore = 3;
  let sportsScore = 3;
  let fishingScore = 3;
  let travelScore = 3;

  // Weather conditions impact
  if (conditions.includes('Storm') || conditions.includes('Blizzard')) {
    outdoorScore -= 2;
    sportsScore -= 2;
    fishingScore -= 2;
    travelScore -= 2;
  } else if (conditions.includes('Rain') || conditions.includes('Snow')) {
    outdoorScore -= 1;
    sportsScore -= 1;
    fishingScore -= 1;
    travelScore -= 1;
  } else if (conditions.includes('Sunny')) {
    outdoorScore += 1;
    sportsScore += 1;
    fishingScore += 1;
  }

  // Precipitation impact
  if (precipitation > 70) {
    outdoorScore -= 2;
    sportsScore -= 2;
    fishingScore -= 1;
    travelScore -= 2;
  } else if (precipitation > 40) {
    outdoorScore -= 1;
    sportsScore -= 1;
    fishingScore -= 0;
    travelScore -= 1;
  }

  // Wind impact
  if (windSpeed > 25) {
    outdoorScore -= 1;
    sportsScore -= 1;
    fishingScore -= 2;
    travelScore -= 1;
  }

  const getRating = (score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (score >= 4) return 'excellent';
    if (score >= 3) return 'good';
    if (score >= 2) return 'fair';
    return 'poor';
  };

  return {
    outdoorActivities: getRating(outdoorScore),
    sports: getRating(sportsScore),
    fishing: getRating(fishingScore),
    travel: getRating(travelScore)
  };
}

// Get weather-based recommendations
export function getWeatherRecommendations(
  predictions: WeatherPrediction[],
  activity: 'outdoor' | 'sports' | 'fishing' | 'travel'
): string[] {
  const recommendations: string[] = [];
  const avgTemp = predictions.reduce((sum, p) => sum + p.temperature, 0) / predictions.length;
  const avgPrecipitation = predictions.reduce((sum, p) => sum + p.precipitation, 0) / predictions.length;

  if (activity === 'outdoor') {
    if (avgPrecipitation > 50) {
      recommendations.push('High precipitation expected - consider indoor alternatives');
    } else if (avgTemp > 85) {
      recommendations.push('Hot temperatures expected - stay hydrated and seek shade');
    } else if (avgTemp < 50) {
      recommendations.push('Cool temperatures - dress in layers');
    } else {
      recommendations.push('Ideal weather for outdoor activities planned');
    }
  }

  if (activity === 'sports') {
    if (avgPrecipitation > 30) {
      recommendations.push('Rain may affect outdoor sports - have backup plans');
    }
    if (avgTemp > 90 || avgTemp < 40) {
      recommendations.push('Extreme temperatures may affect performance');
    }
  }

  if (activity === 'fishing') {
    if (avgPrecipitation > 60) {
      recommendations.push('Heavy rain may make fishing difficult');
    }
    if (avgTemp >= 60 && avgTemp <= 80) {
      recommendations.push('Optimal temperature range for fishing');
    }
  }

  if (activity === 'travel') {
    const severeWeatherDays = predictions.filter(p =>
      p.precipitation > 70 || p.windSpeed > 25
    ).length;

    if (severeWeatherDays > 0) {
      recommendations.push(`${severeWeatherDays} days with potentially hazardous travel conditions`);
    }
  }

  return recommendations;
}
