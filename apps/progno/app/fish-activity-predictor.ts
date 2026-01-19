// Fish Activity Predictor Module for Progno Sports Prediction Platform

import { FishingConditions, TideData, WeatherData } from "./free-data-fetcher";

export interface FishActivityPrediction {
  date: Date;
  overallScore: number;
  timeSlots: TimeSlotPrediction[];
  bestTimeSlot: TimeSlotPrediction;
  targetSpecies: SpeciesPrediction[];
  recommendations: string[];
  riskFactors: string[];
}

export interface TimeSlotPrediction {
  startTime: Date;
  endTime: Date;
  score: number;
  factors: {
    tide: number;
    weather: number;
    moon: number;
    temperature: number;
  };
  description: string;
}

export interface SpeciesPrediction {
  species: string;
  activity: number;
  bestTechnique: string;
  bestBait: string;
  confidence: number;
}

export interface MultiDayPrediction {
  predictions: FishActivityPrediction[];
  summary: {
    bestDay: Date;
    averageScore: number;
    trend: 'improving' | 'stable' | 'declining';
    peakActivityTimes: string[];
  };
}

// Main prediction function for single day
export function predictFishActivity(conditions: FishingConditions): FishActivityPrediction {
  const { location, tides, weather, moonPhase, sunrise, sunset } = conditions;
  const date = new Date();

  // Generate time slots for the day
  const timeSlots = generateTimeSlots(date, tides, weather, moonPhase, sunrise, sunset);

  // Calculate overall score
  const overallScore = calculateOverallScore(timeSlots);

  // Find best time slot
  const bestTimeSlot = timeSlots.reduce((best, current) =>
    current.score > best.score ? current : best
  );

  // Predict target species
  const targetSpecies = predictSpecies(conditions, bestTimeSlot.score);

  // Generate recommendations
  const recommendations = generateRecommendations(bestTimeSlot, conditions);

  // Identify risk factors
  const riskFactors = identifyRiskFactors(weather, tides);

  return {
    date,
    overallScore,
    timeSlots,
    bestTimeSlot,
    targetSpecies,
    recommendations,
    riskFactors
  };
}

// Multi-day prediction
export function predictFishActivityMultiDay(
  conditions: FishingConditions,
  days: number = 7
): MultiDayPrediction {
  const predictions: FishActivityPrediction[] = [];

  for (let day = 0; day < days; day++) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + day);

    // Generate future conditions (simplified)
    const futureConditions = generateFutureConditions(conditions, day);
    const prediction = predictFishActivity(futureConditions);
    predictions.push(prediction);
  }

  const summary = {
    bestDay: predictions.reduce((best, current) =>
      current.overallScore > best.overallScore ? current : best
    , predictions[0]).date,
    averageScore: predictions.reduce((sum, p) => sum + p.overallScore, 0) / predictions.length,
    trend: calculateTrend(predictions),
    peakActivityTimes: getPeakActivityTimes(predictions)
  };

  return { predictions, summary };
}

// Generate time slots for a day
function generateTimeSlots(
  date: Date,
  tides: TideData[],
  weather: WeatherData,
  moonPhase: string,
  sunrise: Date,
  sunset: Date
): TimeSlotPrediction[] {
  const slots: TimeSlotPrediction[] = [];

  // Generate 4-hour time slots
  for (let hour = 0; hour < 24; hour += 4) {
    const startTime = new Date(date);
    startTime.setHours(hour, 0, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(hour + 4, 0, 0, 0);

    const factors = calculateTimeSlotFactors(startTime, endTime, tides, weather, moonPhase, sunrise, sunset);
    const score = Object.values(factors).reduce((sum, value) => sum + value, 0) / 4;

    slots.push({
      startTime,
      endTime,
      score,
      factors,
      description: generateTimeSlotDescription(factors, score)
    });
  }

  return slots;
}

// Calculate factors for a time slot
function calculateTimeSlotFactors(
  startTime: Date,
  endTime: Date,
  tides: TideData[],
  weather: WeatherData,
  moonPhase: string,
  sunrise: Date,
  sunset: Date
): { tide: number; weather: number; moon: number; temperature: number } {
  // Tide factor
  const tideFactor = calculateTideFactor(startTime, tides);

  // Weather factor
  const weatherFactor = calculateWeatherFactor(weather);

  // Moon phase factor
  const moonFactor = calculateMoonFactor(moonPhase);

  // Temperature factor
  const temperatureFactor = calculateTemperatureFactor(weather.temperature);

  return {
    tide: tideFactor,
    weather: weatherFactor,
    moon: moonFactor,
    temperature: temperatureFactor
  };
}

// Calculate individual factors
function calculateTideFactor(time: Date, tides: TideData[]): number {
  const nearbyTides = tides.filter(tide =>
    Math.abs(tide.time.getTime() - time.getTime()) < 4 * 60 * 60 * 1000
  );

  if (nearbyTides.length === 0) return 0.5;

  // Best fishing is during moving tides (1-2 hours before/after high/low)
  const movingTideBonus = nearbyTides.some(tide =>
    Math.abs(tide.time.getTime() - time.getTime()) < 2 * 60 * 60 * 1000
  ) ? 0.3 : 0;

  return 0.6 + movingTideBonus;
}

function calculateWeatherFactor(weather: WeatherData): number {
  let score = 0.5;

  // Ideal conditions
  if (weather.temperature >= 60 && weather.temperature <= 85) score += 0.2;
  if (weather.windSpeed <= 15) score += 0.2;
  if (weather.humidity >= 40 && weather.humidity <= 80) score += 0.1;

  return Math.min(1, score);
}

function calculateMoonFactor(moonPhase: string): number {
  const moonScores: { [key: string]: number } = {
    'New Moon': 0.6,
    'Waxing Crescent': 0.7,
    'First Quarter': 0.8,
    'Waxing Gibbous': 0.9,
    'Full Moon': 1.0,
    'Waning Gibbous': 0.9,
    'Last Quarter': 0.8,
    'Waning Crescent': 0.7
  };

  return moonScores[moonPhase] || 0.6;
}

function calculateTemperatureFactor(temperature: number): number {
  if (temperature >= 65 && temperature <= 80) return 1.0;
  if (temperature >= 55 && temperature < 65) return 0.8;
  if (temperature >= 80 && temperature <= 90) return 0.8;
  return 0.5;
}

// Calculate overall score
function calculateOverallScore(timeSlots: TimeSlotPrediction[]): number {
  return timeSlots.reduce((sum, slot) => sum + slot.score, 0) / timeSlots.length;
}

// Predict target species
function predictSpecies(conditions: FishingConditions, score: number): SpeciesPrediction[] {
  const species: SpeciesPrediction[] = [
    {
      species: 'Redfish',
      activity: score * 0.9,
      bestTechnique: 'Sight casting',
      bestBait: 'Live shrimp',
      confidence: 0.8
    },
    {
      species: 'Speckled Trout',
      activity: score * 0.8,
      bestTechnique: 'Drift fishing',
      bestBait: 'Soft plastics',
      confidence: 0.7
    },
    {
      species: 'Flounder',
      activity: score * 0.6,
      bestTechnique: 'Bottom bouncing',
      bestBait: 'Mud minnows',
      confidence: 0.6
    },
    {
      species: 'Spanish Mackerel',
      activity: score * 0.7,
      bestTechnique: 'Trolling',
      bestBait: 'Gotcha lures',
      confidence: 0.5
    }
  ];

  return species.sort((a, b) => b.activity - a.activity).slice(0, 3);
}

// Generate recommendations
function generateRecommendations(bestTimeSlot: TimeSlotPrediction, conditions: FishingConditions): string[] {
  const recommendations: string[] = [];

  if (bestTimeSlot.score > 0.8) {
    recommendations.push('Excellent conditions! Plan your trip around this time slot.');
  } else if (bestTimeSlot.score > 0.6) {
    recommendations.push('Good fishing expected. Check weather before heading out.');
  } else {
    recommendations.push('Fair conditions. Consider alternative activities or locations.');
  }

  if (bestTimeSlot.factors.tide > 0.8) {
    recommendations.push('Optimal tide movement - fish structure and current breaks.');
  }

  if (conditions.weather.windSpeed > 15) {
    recommendations.push('High winds expected - consider protected areas.');
  }

  if (conditions.moonPhase === 'Full Moon') {
    recommendations.push('Full moon - fish may be more active at night.');
  }

  return recommendations;
}

// Identify risk factors
function identifyRiskFactors(weather: WeatherData, tides: TideData[]): string[] {
  const risks: string[] = [];

  if (weather.windSpeed > 20) {
    risks.push('High winds may create dangerous conditions');
  }

  if (weather.temperature < 50 || weather.temperature > 95) {
    risks.push('Extreme temperatures may affect fish behavior');
  }

  if (weather.conditions.includes('Storm') || weather.conditions.includes('Rain')) {
    risks.push('Stormy weather - check marine forecasts');
  }

  const extremeTides = tides.filter(tide => Math.abs(tide.height) > 4);
  if (extremeTides.length > 0) {
    risks.push('Extreme tidal movements - exercise caution');
  }

  return risks;
}

// Generate time slot description
function generateTimeSlotDescription(factors: { tide: number; weather: number; moon: number; temperature: number }, score: number): string {
  const descriptions = [
    'Poor conditions - consider other times',
    'Fair conditions - fishable with patience',
    'Good conditions - worth the effort',
    'Excellent conditions - prime fishing time'
  ];

  const index = Math.floor(score * 3.99);
  return descriptions[index];
}

// Calculate trend
function calculateTrend(predictions: FishActivityPrediction[]): 'improving' | 'stable' | 'declining' {
  if (predictions.length < 3) return 'stable';

  const recent = predictions.slice(-3).map(p => p.overallScore);
  const earlier = predictions.slice(0, 3).map(p => p.overallScore);

  const recentAvg = recent.reduce((sum, score) => sum + score, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, score) => sum + score, 0) / earlier.length;

  if (recentAvg > earlierAvg + 0.1) return 'improving';
  if (recentAvg < earlierAvg - 0.1) return 'declining';
  return 'stable';
}

// Get peak activity times
function getPeakActivityTimes(predictions: FishActivityPrediction[]): string[] {
  const peakSlots = predictions.map(p => p.bestTimeSlot);
  const sortedSlots = peakSlots.sort((a, b) => b.score - a.score);

  return sortedSlots.slice(0, 3).map(slot =>
    `${slot.startTime.getHours()}:00 - ${slot.endTime.getHours()}:00`
  );
}

// Generate future conditions (simplified)
function generateFutureConditions(baseConditions: FishingConditions, daysAhead: number): FishingConditions {
  const futureDate = new Date(baseConditions.location.coordinates.latitude,
                            baseConditions.location.coordinates.longitude);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  // Simple weather variation
  const weatherVariation = {
    temperature: baseConditions.weather.temperature + (Math.random() - 0.5) * 10,
    humidity: Math.max(30, Math.min(100, baseConditions.weather.humidity + (Math.random() - 0.5) * 20)),
    windSpeed: Math.max(0, baseConditions.weather.windSpeed + (Math.random() - 0.5) * 10),
    windDirection: baseConditions.weather.windDirection,
    pressure: baseConditions.weather.pressure + (Math.random() - 0.5) * 5,
    conditions: baseConditions.weather.conditions
  };

  return {
    ...baseConditions,
    weather: weatherVariation,
    moonPhase: getMoonPhase(futureDate)
  };
}

function getMoonPhase(date: Date): string {
  const phases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
                  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  const dayOfMonth = date.getDate();
  const phaseIndex = Math.floor((dayOfMonth - 1) / 3.75) % 8;
  return phases[phaseIndex];
}
