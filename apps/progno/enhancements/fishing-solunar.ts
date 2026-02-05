/**
 * Solunar Tables and Advanced Fishing Predictions
 * Enhances fishing predictions with moon phase, solunar periods, and barometric pressure
 */

export interface SolunarData {
  date: Date;
  moonPhase: MoonPhase;
  moonRise: Date;
  moonSet: Date;
  sunRise: Date;
  sunSet: Date;
  majorPeriods: SolunarPeriod[];
  minorPeriods: SolunarPeriod[];
  moonIllumination: number; // 0-1
}

export interface MoonPhase {
  phase: 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' | 
         'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';
  name: string;
  fishingRating: number; // 0-1, best fishing during new/full moon
}

export interface SolunarPeriod {
  type: 'major' | 'minor';
  start: Date;
  end: Date;
  peak: Date;
  intensity: number; // 0-1, how strong the period is
}

export interface BarometricPressure {
  pressure: number; // hPa
  trend: 'rising' | 'falling' | 'stable';
  change24h: number; // hPa change in 24 hours
  fishingImpact: number; // -1 to 1, impact on fishing
}

/**
 * Calculate moon phase
 */
export function calculateMoonPhase(date: Date): MoonPhase {
  // Simplified moon phase calculation
  // In production, use a proper astronomical library
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Approximate days since last new moon
  const daysSinceNew = (year * 365.25 + month * 30.44 + day) % 29.53;
  
  let phase: MoonPhase['phase'];
  let name: string;
  let fishingRating: number;
  
  if (daysSinceNew < 3.69) {
    phase = 'new';
    name = 'New Moon';
    fishingRating = 0.9; // Excellent fishing
  } else if (daysSinceNew < 7.38) {
    phase = 'waxing_crescent';
    name = 'Waxing Crescent';
    fishingRating = 0.6;
  } else if (daysSinceNew < 11.07) {
    phase = 'first_quarter';
    name = 'First Quarter';
    fishingRating = 0.7;
  } else if (daysSinceNew < 14.76) {
    phase = 'waxing_gibbous';
    name = 'Waxing Gibbous';
    fishingRating = 0.5;
  } else if (daysSinceNew < 18.45) {
    phase = 'full';
    name = 'Full Moon';
    fishingRating = 0.85; // Excellent fishing
  } else if (daysSinceNew < 22.14) {
    phase = 'waning_gibbous';
    name = 'Waning Gibbous';
    fishingRating = 0.5;
  } else if (daysSinceNew < 25.83) {
    phase = 'last_quarter';
    name = 'Last Quarter';
    fishingRating = 0.6;
  } else {
    phase = 'waning_crescent';
    name = 'Waning Crescent';
    fishingRating = 0.5;
  }
  
  return { phase, name, fishingRating };
}

/**
 * Calculate solunar periods (best fishing times)
 */
export function calculateSolunarPeriods(
  date: Date,
  latitude: number,
  longitude: number
): { major: SolunarPeriod[]; minor: SolunarPeriod[] } {
  // Simplified calculation
  // In production, use proper astronomical calculations
  
  const major: SolunarPeriod[] = [];
  const minor: SolunarPeriod[] = [];
  
  // Approximate moon rise/set times (simplified)
  const moonRise = new Date(date);
  moonRise.setHours(6 + Math.random() * 6, 0, 0, 0);
  
  const moonSet = new Date(date);
  moonSet.setHours(18 + Math.random() * 6, 0, 0, 0);
  
  // Major periods: 2 hours before/after moon rise and set
  const major1Start = new Date(moonRise);
  major1Start.setHours(major1Start.getHours() - 1);
  const major1End = new Date(moonRise);
  major1End.setHours(major1End.getHours() + 1);
  
  major.push({
    type: 'major',
    start: major1Start,
    end: major1End,
    peak: moonRise,
    intensity: 0.8,
  });
  
  const major2Start = new Date(moonSet);
  major2Start.setHours(major2Start.getHours() - 1);
  const major2End = new Date(moonSet);
  major2End.setHours(major2End.getHours() + 1);
  
  major.push({
    type: 'major',
    start: major2Start,
    end: major2End,
    peak: moonSet,
    intensity: 0.8,
  });
  
  // Minor periods: halfway between major periods
  const minor1Time = new Date((major1End.getTime() + major2Start.getTime()) / 2);
  const minor1Start = new Date(minor1Time);
  minor1Start.setHours(minor1Start.getHours() - 0.5);
  const minor1End = new Date(minor1Time);
  minor1End.setHours(minor1End.getHours() + 0.5);
  
  minor.push({
    type: 'minor',
    start: minor1Start,
    end: minor1End,
    peak: minor1Time,
    intensity: 0.5,
  });
  
  return { major, minor };
}

/**
 * Analyze barometric pressure impact
 */
export function analyzeBarometricPressure(
  currentPressure: number,
  previousPressure?: number
): BarometricPressure {
  const trend = previousPressure 
    ? (currentPressure > previousPressure + 2 ? 'rising' :
       currentPressure < previousPressure - 2 ? 'falling' : 'stable')
    : 'stable';
  
  const change24h = previousPressure ? currentPressure - previousPressure : 0;
  
  // Fishing is best when pressure is stable or rising
  // Falling pressure (storm approaching) can be good for some species
  let fishingImpact = 0;
  
  if (trend === 'stable') {
    fishingImpact = 0.3; // Good
  } else if (trend === 'rising') {
    fishingImpact = 0.5; // Excellent
  } else if (trend === 'falling') {
    if (Math.abs(change24h) > 5) {
      fishingImpact = -0.2; // Bad (storm)
    } else {
      fishingImpact = 0.1; // Slightly positive
    }
  }
  
  return {
    pressure: currentPressure,
    trend,
    change24h,
    fishingImpact,
  };
}

/**
 * Get complete solunar data
 */
export function getSolunarData(
  date: Date,
  latitude: number,
  longitude: number
): SolunarData {
  const moonPhase = calculateMoonPhase(date);
  const { major, minor } = calculateSolunarPeriods(date, latitude, longitude);
  
  // Approximate moon rise/set
  const moonRise = new Date(date);
  moonRise.setHours(6 + Math.random() * 6, 0, 0, 0);
  const moonSet = new Date(date);
  moonSet.setHours(18 + Math.random() * 6, 0, 0, 0);
  
  // Sun rise/set (simplified)
  const sunRise = new Date(date);
  sunRise.setHours(6, 30, 0, 0);
  const sunSet = new Date(date);
  sunSet.setHours(18, 30, 0, 0);
  
  // Moon illumination (simplified)
  const illumination = moonPhase.phase === 'new' ? 0 :
                      moonPhase.phase === 'full' ? 1 :
                      moonPhase.phase.includes('quarter') ? 0.5 : 0.25;
  
  return {
    date,
    moonPhase,
    moonRise,
    moonSet,
    sunRise,
    sunSet,
    majorPeriods: major,
    minorPeriods: minor,
    moonIllumination: illumination,
  };
}

/**
 * Enhance fishing prediction with solunar data
 */
export function enhanceFishingWithSolunar(
  baseProbability: number,
  solunarData: SolunarData,
  barometricPressure: BarometricPressure,
  currentTime: Date
): {
  enhancedProbability: number;
  adjustments: Array<{ factor: string; impact: number }>;
  bestTimes: Date[];
} {
  let enhancedProbability = baseProbability;
  const adjustments: Array<{ factor: string; impact: number }> = [];
  
  // Moon phase adjustment
  const moonImpact = (solunarData.moonPhase.fishingRating - 0.5) * 0.15;
  enhancedProbability += moonImpact;
  adjustments.push({
    factor: `Moon Phase (${solunarData.moonPhase.name})`,
    impact: moonImpact,
  });
  
  // Check if current time is in a solunar period
  const inMajorPeriod = solunarData.majorPeriods.some(period => 
    currentTime >= period.start && currentTime <= period.end
  );
  const inMinorPeriod = solunarData.minorPeriods.some(period => 
    currentTime >= period.start && currentTime <= period.end
  );
  
  if (inMajorPeriod) {
    const periodImpact = 0.2;
    enhancedProbability += periodImpact;
    adjustments.push({
      factor: 'Major Solunar Period',
      impact: periodImpact,
    });
  } else if (inMinorPeriod) {
    const periodImpact = 0.1;
    enhancedProbability += periodImpact;
    adjustments.push({
      factor: 'Minor Solunar Period',
      impact: periodImpact,
    });
  }
  
  // Barometric pressure adjustment
  enhancedProbability += barometricPressure.fishingImpact * 0.1;
  adjustments.push({
    factor: `Barometric Pressure (${barometricPressure.trend})`,
    impact: barometricPressure.fishingImpact * 0.1,
  });
  
  // Get best times (combine major periods and optimal conditions)
  const bestTimes = [
    ...solunarData.majorPeriods.map(p => p.peak),
    ...solunarData.minorPeriods.map(p => p.peak),
  ].sort((a, b) => a.getTime() - b.getTime());
  
  // Clamp probability
  enhancedProbability = Math.max(0, Math.min(1, enhancedProbability));
  
  return {
    enhancedProbability,
    adjustments,
    bestTimes,
  };
}

