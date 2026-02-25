/**
 * Fishing Solunar & Barometric Pressure Module
 * Cross-integration between Progno and GulfCoastCharters
 *
 * Provides:
 *  - Solunar feeding period calculations (major/minor)
 *  - Moon phase with fishing quality rating
 *  - Barometric pressure trend analysis
 *  - Enhanced fishing probability combining all factors
 *
 * Imported by: enhancements/integration-api.ts → getEnhancedFishingPrediction()
 * Consumed by: GCC /api/tides?action=forecast (can call Progno's API)
 */

// ── Solunar Data ─────────────────────────────────────────────────────────────

export interface SolunarData {
  date: Date;
  moonPhase: {
    name: string;        // 'New Moon', 'Full Moon', etc.
    illumination: number; // 0-1
    age: number;          // days into cycle (0-29.53)
  };
  majorPeriods: { start: Date; end: Date; quality: number }[];
  minorPeriods: { start: Date; end: Date; quality: number }[];
  overallRating: number; // 0-100 fishing quality for the day
  bestTimeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';
}

export interface BarometricAnalysis {
  currentPressure: number;   // hPa
  previousPressure?: number;
  trend: 'rising' | 'falling' | 'stable';
  changeRate: number;        // hPa per hour (approx)
  fishingImpact: number;     // -1 to +1
  description: string;
}

export interface EnhancedFishingData {
  enhancedProbability: number;
  bestTimes: Date[];
  adjustments: { factor: string; impact: number }[];
}

// ── Moon Phase Calculator ────────────────────────────────────────────────────

const SYNODIC_MONTH = 29.53059; // days
const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();

function getMoonAge(date: Date): number {
  const daysSince = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
  return ((daysSince % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
}

function getMoonPhaseName(age: number): string {
  const frac = age / SYNODIC_MONTH;
  if (frac < 0.0339 || frac >= 0.966) return 'New Moon';
  if (frac < 0.216) return 'Waxing Crescent';
  if (frac < 0.284) return 'First Quarter';
  if (frac < 0.466) return 'Waxing Gibbous';
  if (frac < 0.534) return 'Full Moon';
  if (frac < 0.716) return 'Waning Gibbous';
  if (frac < 0.784) return 'Last Quarter';
  return 'Waning Crescent';
}

function getMoonIllumination(age: number): number {
  const frac = age / SYNODIC_MONTH;
  return Math.round(50 * (1 - Math.cos(2 * Math.PI * frac))) / 100;
}

// ── Solunar Period Calculation ───────────────────────────────────────────────

/**
 * Calculate approximate moon transit times for solunar feeding periods.
 * Major periods: ~2 hours centered on moon overhead and underfoot.
 * Minor periods: ~1 hour centered on moonrise and moonset.
 */
function calculateSolunarPeriods(date: Date, latitude: number, longitude: number) {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );

  // Approximate moon transit using longitude offset (simplified ephemeris)
  const baseMoonrise = ((dayOfYear * 50.47 + longitude * 4) % 1440 + 1440) % 1440;
  const moonTransit = (baseMoonrise + 360) % 1440; // overhead
  const moonUnderfoot = (moonTransit + 720) % 1440;
  const moonrise = baseMoonrise;
  const moonset = (baseMoonrise + 720) % 1440;

  const toDate = (minutesFromMidnight: number): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setMinutes(((minutesFromMidnight % 1440) + 1440) % 1440);
    return d;
  };

  // Moon age affects period quality
  const moonAge = getMoonAge(date);
  const phaseName = getMoonPhaseName(moonAge);
  const isNewOrFull = phaseName === 'New Moon' || phaseName === 'Full Moon';
  const qualityBoost = isNewOrFull ? 1.3 : 1.0;

  const majorPeriods = [
    {
      start: toDate(moonTransit - 60),
      end: toDate(moonTransit + 60),
      quality: Math.min(1, 0.8 * qualityBoost),
    },
    {
      start: toDate(moonUnderfoot - 60),
      end: toDate(moonUnderfoot + 60),
      quality: Math.min(1, 0.7 * qualityBoost),
    },
  ];

  const minorPeriods = [
    {
      start: toDate(moonrise - 30),
      end: toDate(moonrise + 30),
      quality: Math.min(1, 0.5 * qualityBoost),
    },
    {
      start: toDate(moonset - 30),
      end: toDate(moonset + 30),
      quality: Math.min(1, 0.5 * qualityBoost),
    },
  ];

  return { majorPeriods, minorPeriods };
}

// ── Fishing Day Rating ───────────────────────────────────────────────────────

/**
 * Rate the fishing quality for a given day based on solunar theory.
 * New Moon and Full Moon = best (100), Quarters = worst (~50).
 * Dawn/dusk near major periods = bonus.
 */
function rateFishingDay(date: Date, latitude: number): number {
  const moonAge = getMoonAge(date);
  const phaseName = getMoonPhaseName(moonAge);

  // Base score from moon phase
  let score: number;
  switch (phaseName) {
    case 'New Moon':
    case 'Full Moon':
      score = 90;
      break;
    case 'Waxing Crescent':
    case 'Waning Crescent':
      score = 70;
      break;
    case 'Waxing Gibbous':
    case 'Waning Gibbous':
      score = 60;
      break;
    case 'First Quarter':
    case 'Last Quarter':
      score = 50;
      break;
    default:
      score = 60;
  }

  // Seasonal adjustment for Gulf Coast (summer = warmer water = more active fish)
  const month = date.getMonth(); // 0-11
  if (month >= 3 && month <= 9) score += 5; // April-October bonus
  if (month >= 5 && month <= 7) score += 5; // June-August extra bonus

  return Math.min(100, Math.max(0, score));
}

function getBestTimeOfDay(date: Date): SolunarData['bestTimeOfDay'] {
  const month = date.getMonth();
  // Summer: early morning is best (cooler water)
  if (month >= 5 && month <= 8) return 'dawn';
  // Spring/Fall: morning and dusk
  if (month >= 3 && month <= 4 || month >= 9 && month <= 10) return 'morning';
  // Winter: midday when water is warmest
  return 'midday';
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get complete solunar data for a date and location.
 */
export function getSolunarData(date: Date, latitude: number, longitude: number): SolunarData {
  const moonAge = getMoonAge(date);
  const { majorPeriods, minorPeriods } = calculateSolunarPeriods(date, latitude, longitude);

  return {
    date,
    moonPhase: {
      name: getMoonPhaseName(moonAge),
      illumination: getMoonIllumination(moonAge),
      age: Math.round(moonAge * 100) / 100,
    },
    majorPeriods,
    minorPeriods,
    overallRating: rateFishingDay(date, latitude),
    bestTimeOfDay: getBestTimeOfDay(date),
  };
}

/**
 * Analyze barometric pressure trend and its impact on fishing.
 *
 * Fish behavior:
 *  - Stable high pressure (1013-1025): Normal feeding, good
 *  - Slowly falling: Fish sense storm approaching, feed aggressively = EXCELLENT
 *  - Rapidly falling: Storm imminent, fish stop feeding = BAD
 *  - Rising after storm: Fish resume feeding = GOOD
 *  - Stable low: Sluggish feeding = POOR
 */
export function analyzeBarometricPressure(
  currentPressure: number,
  previousPressure?: number
): BarometricAnalysis {
  const change = previousPressure != null ? currentPressure - previousPressure : 0;
  const changeRate = change; // assumes ~1 hour between readings

  let trend: BarometricAnalysis['trend'];
  if (Math.abs(change) < 0.5) trend = 'stable';
  else if (change > 0) trend = 'rising';
  else trend = 'falling';

  let fishingImpact: number;
  let description: string;

  if (trend === 'stable' && currentPressure >= 1013 && currentPressure <= 1025) {
    fishingImpact = 0.1;
    description = 'Stable high pressure — normal feeding patterns, good conditions';
  } else if (trend === 'falling' && Math.abs(change) < 3) {
    fishingImpact = 0.3;
    description = 'Slowly falling pressure — fish feed aggressively before storm, excellent!';
  } else if (trend === 'falling' && Math.abs(change) >= 3) {
    fishingImpact = -0.3;
    description = 'Rapidly falling pressure — storm imminent, fish stop feeding';
  } else if (trend === 'rising' && previousPressure != null && previousPressure < 1010) {
    fishingImpact = 0.2;
    description = 'Rising after low — fish resuming feeding post-storm';
  } else if (trend === 'rising') {
    fishingImpact = 0.05;
    description = 'Rising pressure — steady conditions, moderate fishing';
  } else if (trend === 'stable' && currentPressure < 1010) {
    fishingImpact = -0.2;
    description = 'Stable low pressure — sluggish fish, poor conditions';
  } else {
    fishingImpact = 0;
    description = 'Neutral conditions';
  }

  return {
    currentPressure,
    previousPressure,
    trend,
    changeRate,
    fishingImpact,
    description,
  };
}

/**
 * Enhance a base fishing probability with solunar and barometric data.
 * Used by Progno's integration-api.ts → getEnhancedFishingPrediction()
 * and can be called from GCC's tides API for cross-platform integration.
 */
export function enhanceFishingWithSolunar(
  baseProbability: number,
  solunarData: SolunarData,
  barometric: BarometricAnalysis,
  currentTime: Date
): EnhancedFishingData {
  const adjustments: { factor: string; impact: number }[] = [];
  let enhanced = baseProbability;

  // 1. Moon phase adjustment (±15%)
  const moonAdj = ((solunarData.overallRating - 60) / 100) * 0.15;
  enhanced += moonAdj;
  adjustments.push({
    factor: `Moon: ${solunarData.moonPhase.name} (${solunarData.overallRating}/100)`,
    impact: moonAdj,
  });

  // 2. Barometric pressure adjustment (±30%)
  const pressureAdj = barometric.fishingImpact * 0.3;
  enhanced += pressureAdj;
  adjustments.push({
    factor: `Pressure: ${barometric.trend} (${barometric.currentPressure} hPa)`,
    impact: pressureAdj,
  });

  // 3. Solunar period bonus — check if current time is in a major/minor period
  const now = currentTime.getTime();
  let periodBonus = 0;
  for (const p of solunarData.majorPeriods) {
    if (now >= p.start.getTime() && now <= p.end.getTime()) {
      periodBonus = p.quality * 0.15;
      adjustments.push({ factor: 'In Major Solunar Period', impact: periodBonus });
      break;
    }
  }
  if (periodBonus === 0) {
    for (const p of solunarData.minorPeriods) {
      if (now >= p.start.getTime() && now <= p.end.getTime()) {
        periodBonus = p.quality * 0.08;
        adjustments.push({ factor: 'In Minor Solunar Period', impact: periodBonus });
        break;
      }
    }
  }
  enhanced += periodBonus;

  // 4. Time of day bonus
  const hour = currentTime.getHours();
  const isDawn = hour >= 5 && hour <= 7;
  const isDusk = hour >= 17 && hour <= 19;
  if (isDawn || isDusk) {
    const timeAdj = 0.05;
    enhanced += timeAdj;
    adjustments.push({ factor: isDawn ? 'Dawn (golden hour)' : 'Dusk (golden hour)', impact: timeAdj });
  }

  // Clamp to 0-1
  enhanced = Math.max(0, Math.min(1, enhanced));

  // Best fishing times: centers of major periods
  const bestTimes = solunarData.majorPeriods.map(p => {
    const mid = new Date((p.start.getTime() + p.end.getTime()) / 2);
    return mid;
  });

  return {
    enhancedProbability: Math.round(enhanced * 1000) / 1000,
    bestTimes,
    adjustments,
  };
}
