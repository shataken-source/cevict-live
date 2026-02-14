// Cat Physics - Probability engine for lost cat location prediction
// Shows AI logic transparently: weather + terrain + behavior = where to look first

export interface CatProfile {
  name: string;
  isIndoorOnly: boolean;
  lastSeenLocation: { lat: number; lng: number };
  lastSeenTime: Date;
  color: string;
  age: number; // years
}

export interface SearchZone {
  name: string;
  radiusMeters: number;
  probability: number;
  reasoning: string;
  searchTips: string[];
}

export interface WeatherData {
  tempF: number;
  conditions: 'clear' | 'rain' | 'snow' | 'cloudy';
  windSpeedMph: number;
}

export interface TerrainFeatures {
  hasEngineBlocks: boolean; // parked cars nearby
  hasCrawlspaces: boolean;
  hasDecks: boolean;
  hasGarages: boolean;
  hasWoods: boolean;
  hidingDensity: number; // 0-1, how many hiding spots per sq meter
}

/**
 * Cat Physics Engine
 * Based on real-world cat behavior research:
 * - Most lost cats within 3-5 houses (50-150m)
 * - Indoor-only cats: 75% within immediate perimeter
 * - Outdoor cats: territory boundaries (~2 blocks, 200m)
 * - Cats go UP or UNDER, not far horizontal
 * - Crepuscular: dawn/dusk most active
 * - Rain/cold: seek warm enclosed spaces (engines, crawlspaces)
 */
export class CatPhysicsEngine {
  /**
   * Generate probability zones for where to search
   */
  static generateSearchZones(
    cat: CatProfile,
    weather: WeatherData,
    terrain: TerrainFeatures,
    currentTime: Date = new Date()
  ): SearchZone[] {
    const zones: SearchZone[] = [];
    const hoursSinceLost = (currentTime.getTime() - cat.lastSeenTime.getTime()) / (1000 * 60 * 60);

    // Zone 1: Immediate Perimeter (50m radius)
    const immediateProb = this.calculateImmediatePerimeterProbability(
      cat.isIndoorOnly,
      hoursSinceLost,
      terrain.hidingDensity
    );
    zones.push({
      name: 'Immediate Perimeter',
      radiusMeters: 50,
      probability: immediateProb,
      reasoning: cat.isIndoorOnly
        ? `Indoor-only cat: ${(immediateProb * 100).toFixed(0)}% of lost indoor cats stay within 3-5 houses. High hiding density (${terrain.hidingDensity.toFixed(1)}) increases probability.`
        : `Outdoor cat: Likely within immediate territory. Hiding density: ${terrain.hidingDensity.toFixed(1)}.`,
      searchTips: this.getImmediatePerimeterTips(cat, weather, terrain, currentTime),
    });

    // Zone 2: Extended Territory (150m radius)
    const extendedProb = this.calculateExtendedTerritoryProbability(
      cat.isIndoorOnly,
      hoursSinceLost,
      weather
    );
    zones.push({
      name: 'Extended Territory',
      radiusMeters: 150,
      probability: extendedProb,
      reasoning: `${(extendedProb * 100).toFixed(0)}% chance within 150m. ${this.getWeatherImpactReasoning(weather)}`,
      searchTips: this.getExtendedTerritoryTips(cat, weather, terrain),
    });

    // Zone 3: Far Range (300m radius) - only if outdoor cat or >24h lost
    if (!cat.isIndoorOnly || hoursSinceLost > 24) {
      const farProb = this.calculateFarRangeProbability(cat.isIndoorOnly, hoursSinceLost);
      zones.push({
        name: 'Far Range',
        radiusMeters: 300,
        probability: farProb,
        reasoning: cat.isIndoorOnly
          ? `Indoor cat lost >24h: ${(farProb * 100).toFixed(0)}% may have moved farther due to panic or being chased.`
          : `Outdoor cat: ${(farProb * 100).toFixed(0)}% within extended territory boundaries.`,
        searchTips: [
          'Ask neighbors if they\'ve seen your cat',
          'Check with local shelters and vets',
          'Post flyers at key intersections',
          'Search during dawn (5-7am) or dusk (5-7pm) when cats are most active',
        ],
      });
    }

    return zones.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Immediate perimeter probability (0-50m)
   * Indoor-only cats: 75% base, modified by hiding density
   * Outdoor cats: 60% base, modified by hiding density
   */
  private static calculateImmediatePerimeterProbability(
    isIndoorOnly: boolean,
    hoursSinceLost: number,
    hidingDensity: number
  ): number {
    const baseProb = isIndoorOnly ? 0.75 : 0.6;
    const hidingBonus = hidingDensity * 0.15; // High hiding spots = cat more likely to stay close
    const timeDecay = Math.max(0, 1 - hoursSinceLost / 72); // Probability decreases over 3 days
    return Math.min(0.95, (baseProb + hidingBonus) * timeDecay);
  }

  /**
   * Extended territory probability (50-150m)
   */
  private static calculateExtendedTerritoryProbability(
    isIndoorOnly: boolean,
    hoursSinceLost: number,
    weather: WeatherData
  ): number {
    const baseProb = isIndoorOnly ? 0.2 : 0.3;
    const weatherPenalty = this.getWeatherPenalty(weather); // Bad weather = less likely to roam
    const timeIncrease = Math.min(0.2, hoursSinceLost / 120); // Probability increases over time
    return Math.max(0.05, (baseProb - weatherPenalty + timeIncrease));
  }

  /**
   * Far range probability (150-300m)
   */
  private static calculateFarRangeProbability(isIndoorOnly: boolean, hoursSinceLost: number): number {
    if (isIndoorOnly && hoursSinceLost < 24) return 0.05;
    const baseProb = isIndoorOnly ? 0.1 : 0.15;
    const timeIncrease = Math.min(0.15, hoursSinceLost / 240);
    return baseProb + timeIncrease;
  }

  /**
   * Weather penalty (reduces roaming probability)
   */
  private static getWeatherPenalty(weather: WeatherData): number {
    if (weather.conditions === 'rain' || weather.conditions === 'snow') return 0.15;
    if (weather.tempF < 40 || weather.tempF > 95) return 0.1;
    if (weather.windSpeedMph > 20) return 0.05;
    return 0;
  }

  /**
   * Weather impact reasoning (for transparency)
   */
  private static getWeatherImpactReasoning(weather: WeatherData): string {
    if (weather.conditions === 'rain') return 'Rain: cats seek shelter, less likely to roam far.';
    if (weather.conditions === 'snow') return 'Snow: cats stay close to warm enclosed spaces.';
    if (weather.tempF < 40) return `Cold (${weather.tempF}°F): cats seek warmth (engine blocks, crawlspaces).`;
    if (weather.tempF > 90) return `Hot (${weather.tempF}°F): cats seek shade, less active.`;
    if (weather.windSpeedMph > 20) return `Windy (${weather.windSpeedMph}mph): cats hide from wind.`;
    return 'Clear conditions: normal search patterns apply.';
  }

  /**
   * Immediate perimeter search tips (context-aware)
   */
  private static getImmediatePerimeterTips(
    cat: CatProfile,
    weather: WeatherData,
    terrain: TerrainFeatures,
    currentTime: Date
  ): string[] {
    const tips: string[] = [];
    const hour = currentTime.getHours();

    // Verticality tip (cats go up or under)
    tips.push('Check UNDER: decks, porches, cars, bushes, crawlspaces');
    tips.push('Check ABOVE: trees, roofs, garages, fences (cats climb when scared)');

    // Weather-specific tips
    if (weather.conditions === 'rain' || weather.tempF < 50) {
      if (terrain.hasEngineBlocks) {
        tips.push('🚗 CHECK ENGINE BLOCKS: Cats seek warmth. Check under car hoods (tap before starting!)');
      }
      if (terrain.hasCrawlspaces) {
        tips.push('🏠 CHECK CRAWLSPACES: Warm, enclosed spaces are ideal hiding spots in cold/rain');
      }
    }

    if (terrain.hasGarages) {
      tips.push('🔧 CHECK GARAGES: Open doors, closets, behind boxes. Cats hide in dark corners');
    }

    // Time-of-day tip (crepuscular behavior)
    if (hour >= 5 && hour <= 7) {
      tips.push('🌅 DAWN (now): Best search time! Cats are most active at dawn. Listen for meows.');
    } else if (hour >= 17 && hour <= 19) {
      tips.push('🌆 DUSK (now): Best search time! Cats are most active at dusk. Listen for meows.');
    } else if (hour >= 22 || hour <= 5) {
      tips.push('🔦 NIGHTTIME: Use flashlight to check for eye reflection. Cats often "freeze" when scared.');
    } else {
      tips.push('⏰ SEARCH TIMING: Return at dawn (5-7am) or dusk (5-7pm) when cats are most active');
    }

    // Indoor-only specific
    if (cat.isIndoorOnly) {
      tips.push(
        '⚠️ INDOOR-ONLY CAT: Likely hiding silently within 3-5 houses. Bring favorite treats, shake food bag quietly.'
      );
    }

    return tips;
  }

  /**
   * Extended territory search tips
   */
  private static getExtendedTerritoryTips(
    cat: CatProfile,
    weather: WeatherData,
    terrain: TerrainFeatures
  ): string[] {
    const tips: string[] = [
      'Leave carrier with worn clothing outside your door (familiar scent)',
      'Set humane trap with strong-smelling food (tuna, sardines)',
      'Ask neighbors to check their garages, sheds, and basements',
    ];

    if (terrain.hasWoods) {
      tips.push('🌲 WOODED AREAS: Check along tree lines and brush. Cats follow edges, not open spaces.');
    }

    if (weather.conditions === 'clear') {
      tips.push('Post flyers at nearby parks, community boards, and pet stores');
    }

    return tips;
  }

  /**
   * Generate transparency log (for public display)
   * Shows AI reasoning to build trust
   */
  static generateTransparencyLog(
    cat: CatProfile,
    weather: WeatherData,
    terrain: TerrainFeatures,
    zones: SearchZone[]
  ): string {
    const topZone = zones[0];
    return `Today I analyzed ${cat.name}'s profile (${cat.isIndoorOnly ? 'indoor-only' : 'outdoor'} cat, ${cat.age}yo), ` +
      `weather (${weather.conditions}, ${weather.tempF}°F), and terrain data (hiding density: ${terrain.hidingDensity.toFixed(1)}). ` +
      `My logic determined a ${(topZone.probability * 100).toFixed(0)}% probability ${cat.name} is within ${topZone.radiusMeters}m of last seen location. ` +
      `Reasoning: ${topZone.reasoning}`;
  }
}
