/**
 * Intelligent Bait Recommendations AI
 * 
 * AI-powered bait suggestions based on target species, conditions, season, 
 * and recent catch reports from the community.
 * 
 * Recommendation Factors:
 * 1. Target Species: Natural prey preferences
 * 2. Water Clarity: Clear → natural colors, Murky → bright/noisy lures
 * 3. Water Temperature: Cold → slow presentation, Warm → fast/aggressive
 * 4. Time of Day: Dawn/dusk → topwater, Midday → deeper
 * 5. Recent Successes: What's working according to community reports
 */

import { WeatherConditions, WaterConditions } from './fishActivityPredictions';

export interface BaitRecommendation {
  id: string;
  baitType: 'live' | 'artificial' | 'cut';
  baitName: string;
  category: string;
  effectivenessScore: number;     // 0-100
  confidence: number;             // 0.0-1.0
  targetSpecies: string[];
  conditions: {
    waterClarity: 'clear' | 'stained' | 'murky';
    waterTemp: 'cold' | 'cool' | 'warm' | 'hot';
    timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';
    season: 'spring' | 'summer' | 'fall' | 'winter';
  };
  presentation: string;
  retrievalSpeed: 'slow' | 'medium' | 'fast';
  color: string[];
  size: string;
  reasoning: string;
  recentSuccess: boolean;
  communityRating: number;         // 0-5 stars
  priceRange: {
    min: number;
    max: number;
  };
  whereToBuy: string[];
}

export interface CommunityCatchReport {
  id: string;
  species: string;
  bait: string;
  location: string;
  date: string;
  conditions: {
    weather: WeatherConditions;
    water: WaterConditions;
    timeOfDay: string;
  };
  success: {
    fishCaught: number;
    averageSize: number;
    rating: number;               // 1-5 stars
  };
}

export interface BaitDatabase {
  species: string;
  baits: BaitEntry[];
}

export interface BaitEntry {
  name: string;
  type: 'live' | 'artificial' | 'cut';
  category: string;
  effectiveness: number;         // Base effectiveness 0-100
  bestConditions: {
    clarity: string[];
    temperature: string[];
    timeOfDay: string[];
    season: string[];
  };
  presentation: string;
  retrievalSpeed: 'slow' | 'medium' | 'fast';
  colors: string[];
  sizes: string[];
  priceRange: {
    min: number;
    max: number;
  };
  naturalPrey?: string;
}

export class BaitRecommendations {
  private static instance: BaitRecommendations;
  private baitDatabase: Map<string, BaitDatabase> = new Map();
  private communityReports: CommunityCatchReport[] = [];
  private lastUpdated: string;

  // Comprehensive bait database for Gulf Coast species
  private readonly BAIT_DATA: BaitEntry[] = [
    // Live Baits
    {
      name: 'Live Shrimp',
      type: 'live',
      category: 'Crustacean',
      effectiveness: 95,
      bestConditions: {
        clarity: ['clear', 'stained', 'murky'],
        temperature: ['warm', 'hot'],
        timeOfDay: ['dawn', 'morning', 'afternoon', 'dusk'],
        season: ['spring', 'summer', 'fall'],
      },
      presentation: 'Carolina rig, popping cork, free-lined',
      retrievalSpeed: 'slow',
      colors: ['natural'],
      sizes: ['small', 'medium'],
      priceRange: { min: 8, max: 15 },
      naturalPrey: 'Natural prey for most Gulf species',
    },
    {
      name: 'Live Mullet',
      type: 'live',
      category: 'Baitfish',
      effectiveness: 90,
      bestConditions: {
        clarity: ['clear', 'stained'],
        temperature: ['warm', 'hot'],
        timeOfDay: ['morning', 'afternoon', 'dusk'],
        season: ['summer', 'fall'],
      },
      presentation: 'Free-lined, bottom rig, trolling',
      retrievalSpeed: 'medium',
      colors: ['natural'],
      sizes: ['medium', 'large'],
      priceRange: { min: 12, max: 20 },
      naturalPrey: 'Primary forage for larger predators',
    },
    {
      name: 'Live Croaker',
      type: 'live',
      category: 'Baitfish',
      effectiveness: 85,
      bestConditions: {
        clarity: ['clear', 'stained'],
        temperature: ['warm', 'hot'],
        timeOfDay: ['morning', 'afternoon'],
        season: ['summer', 'fall'],
      },
      presentation: 'Carolina rig, fish finder rig',
      retrievalSpeed: 'slow',
      colors: ['natural'],
      sizes: ['small', 'medium'],
      priceRange: { min: 10, max: 18 },
      naturalPrey: 'Excellent for trophy speckled trout',
    },
    {
      name: 'Live Pinfish',
      type: 'live',
      category: 'Baitfish',
      effectiveness: 80,
      bestConditions: {
        clarity: ['clear', 'stained', 'murky'],
        temperature: ['cool', 'warm', 'hot'],
        timeOfDay: ['morning', 'afternoon', 'dusk'],
        season: ['spring', 'summer', 'fall', 'winter'],
      },
      presentation: 'Bottom rig, free-lined',
      retrievalSpeed: 'slow',
      colors: ['natural'],
      sizes: ['small', 'medium'],
      priceRange: { min: 6, max: 12 },
      naturalPrey: 'Hardy bait, good for redfish and snook',
    },
    
    // Artificial Lures
    {
      name: 'MirrOlure Top Dog',
      type: 'artificial',
      category: 'Topwater',
      effectiveness: 85,
      bestConditions: {
        clarity: ['clear', 'stained'],
        temperature: ['warm', 'hot'],
        timeOfDay: ['dawn', 'dusk'],
        season: ['spring', 'summer', 'fall'],
      },
      presentation: 'Walk-the-dog, twitch-pause',
      retrievalSpeed: 'medium',
      colors: ['chrome', 'bone', 'red/white'],
      sizes: ['medium'],
      priceRange: { min: 8, max: 12 },
    },
    {
      name: 'Z-Man MinnowZ',
      type: 'artificial',
      category: 'Soft Plastic',
      effectiveness: 88,
      bestConditions: {
        clarity: ['clear', 'stained'],
        temperature: ['cool', 'warm', 'hot'],
        timeOfDay: ['morning', 'midday', 'afternoon'],
        season: ['spring', 'summer', 'fall', 'winter'],
      },
      presentation: 'Jig head, Texas rig',
      retrievalSpeed: 'slow',
      colors: ['pearl', 'chartreuse', 'new penny'],
      sizes: ['small', 'medium'],
      priceRange: { min: 5, max: 8 },
    },
    {
      name: 'DOA Shrimp',
      type: 'artificial',
      category: 'Soft Plastic',
      effectiveness: 82,
      bestConditions: {
        clarity: ['clear', 'stained'],
        temperature: ['warm', 'hot'],
        timeOfDay: ['morning', 'afternoon', 'dusk'],
        season: ['spring', 'summer', 'fall'],
      },
      presentation: 'Popping cork, jig head',
      retrievalSpeed: 'slow',
      colors: ['glow', 'natural', 'chartreuse'],
      sizes: ['small', 'medium'],
      priceRange: { min: 4, max: 7 },
    },
    {
      name: 'Rapala X-Rap',
      type: 'artificial',
      category: 'Hard Lure',
      effectiveness: 80,
      bestConditions: {
        clarity: ['clear', 'stained'],
        temperature: ['cool', 'warm'],
        timeOfDay: ['morning', 'afternoon'],
        season: ['spring', 'fall', 'winter'],
      },
      presentation: 'Twitch-pause, steady retrieve',
      retrievalSpeed: 'medium',
      colors: ['silver', 'gold', 'firetiger'],
      sizes: ['medium', 'large'],
      priceRange: { min: 10, max: 15 },
    },
    {
      name: 'Berkley Gulp! Shrimp',
      type: 'artificial',
      category: 'Soft Plastic',
      effectiveness: 78,
      bestConditions: {
        clarity: ['stained', 'murky'],
        temperature: ['cool', 'warm', 'hot'],
        timeOfDay: ['morning', 'midday', 'afternoon'],
        season: ['spring', 'summer', 'fall', 'winter'],
      },
      presentation: 'Jig head, bottom rig',
      retrievalSpeed: 'slow',
      colors: ['new penny', 'glow', 'chartreuse'],
      sizes: ['small', 'medium'],
      priceRange: { min: 6, max: 10 },
    },
    
    // Cut Baits
    {
      name: 'Cut Mullet',
      type: 'cut',
      category: 'Cut Bait',
      effectiveness: 75,
      bestConditions: {
        clarity: ['stained', 'murky'],
        temperature: ['warm', 'hot'],
        timeOfDay: ['morning', 'afternoon', 'dusk'],
        season: ['summer', 'fall'],
      },
      presentation: 'Bottom rig, fish finder',
      retrievalSpeed: 'slow',
      colors: ['natural'],
      sizes: ['medium', 'large'],
      priceRange: { min: 5, max: 10 },
    },
    {
      name: 'Cut Ladyfish',
      type: 'cut',
      category: 'Cut Bait',
      effectiveness: 85,
      bestConditions: {
        clarity: ['stained', 'murky'],
        temperature: ['warm', 'hot'],
        timeOfDay: ['morning', 'afternoon', 'dusk'],
        season: ['summer', 'fall'],
      },
      presentation: 'Bottom rig for tarpon, sharks',
      retrievalSpeed: 'slow',
      colors: ['natural'],
      sizes: ['large'],
      priceRange: { min: 8, max: 15 },
    },
  ];

  public static getInstance(): BaitRecommendations {
    if (!BaitRecommendations.instance) {
      BaitRecommendations.instance = new BaitRecommendations();
    }
    return BaitRecommendations.instance;
  }

  private constructor() {
    this.initializeBaitDatabase();
    this.lastUpdated = new Date().toISOString();
  }

  /**
   * Get bait recommendations for specific conditions
   */
  public async getRecommendations(
    targetSpecies: string[],
    weather: WeatherConditions,
    water: WaterConditions,
    timeOfDay: string,
    location: string
  ): Promise<BaitRecommendation[]> {
    const conditions = this.analyzeConditions(weather, water, timeOfDay);
    const recommendations: BaitRecommendation[] = [];

    for (const species of targetSpecies) {
      const speciesBaits = this.getBaitForSpecies(species);
      
      for (const bait of speciesBaits) {
        const score = this.calculateEffectivenessScore(bait, conditions);
        
        if (score >= 60) { // Only include effective baits
          const recommendation = this.createRecommendation(bait, species, conditions, score);
          recommendations.push(recommendation);
        }
      }
    }

    // Sort by effectiveness score
    recommendations.sort((a, b) => b.effectivenessScore - a.effectivenessScore);

    // Apply community learning
    return this.applyCommunityLearning(recommendations, location, conditions);
  }

  /**
   * Add community catch report for learning
   */
  public addCommunityReport(report: CommunityCatchReport): void {
    this.communityReports.push(report);
    
    // Keep only last 1000 reports to manage memory
    if (this.communityReports.length > 1000) {
      this.communityReports = this.communityReports.slice(-1000);
    }
    
    this.lastUpdated = new Date().toISOString();
  }

  /**
   * Get top performing baits by location
   */
  public getTopBaitsByLocation(location: string, days: number = 30): {
    bait: string;
    successRate: number;
    averageRating: number;
    totalReports: number;
  }[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentReports = this.communityReports.filter(report => 
      report.location === location && new Date(report.date) >= cutoffDate
    );
    
    const baitStats = new Map<string, {
      successCount: number;
      totalRating: number;
      reportCount: number;
    }>();
    
    recentReports.forEach(report => {
      const stats = baitStats.get(report.bait) || {
        successCount: 0,
        totalRating: 0,
        reportCount: 0,
      };
      
      stats.successCount += report.success.fishCaught > 0 ? 1 : 0;
      stats.totalRating += report.success.rating;
      stats.reportCount += 1;
      
      baitStats.set(report.bait, stats);
    });
    
    return Array.from(baitStats.entries())
      .map(([bait, stats]) => ({
        bait,
        successRate: (stats.successCount / stats.reportCount) * 100,
        averageRating: stats.totalRating / stats.reportCount,
        totalReports: stats.reportCount,
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10);
  }

  /**
   * Initialize bait database by species
   */
  private initializeBaitDatabase(): void {
    const speciesGroups = {
      'redfish': this.BAIT_DATA.filter(b => 
        b.name.includes('Shrimp') || b.name.includes('Mullet') || 
        b.name.includes('Pinfish') || b.name.includes('Cut')
      ),
      'speckled trout': this.BAIT_DATA.filter(b => 
        b.name.includes('Shrimp') || b.name.includes('Croaker') || 
        b.name.includes('Top Dog') || b.name.includes('DOA')
      ),
      'snook': this.BAIT_DATA.filter(b => 
        b.name.includes('Mullet') || b.name.includes('Pinfish') || 
        b.name.includes('Top Dog') || b.name.includes('X-Rap')
      ),
      'tarpon': this.BAIT_DATA.filter(b => 
        b.name.includes('Mullet') || b.name.includes('Ladyfish') || 
        b.name.includes('Crab')
      ),
      'flounder': this.BAIT_DATA.filter(b => 
        b.name.includes('Shrimp') || b.name.includes('Mullet') || 
        b.name.includes('Cut')
      ),
    };

    for (const [species, baits] of Object.entries(speciesGroups)) {
      this.baitDatabase.set(species, { species, baits });
    }
  }

  /**
   * Analyze current conditions
   */
  private analyzeConditions(
    weather: WeatherConditions,
    water: WaterConditions,
    timeOfDay: string
  ): {
    waterClarity: 'clear' | 'stained' | 'murky';
    waterTemp: 'cold' | 'cool' | 'warm' | 'hot';
    timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';
    season: 'spring' | 'summer' | 'fall' | 'winter';
  } {
    const hour = new Date().getHours();
    const month = new Date().getMonth() + 1;
    
    let waterClarity: 'clear' | 'stained' | 'murky';
    if (water.clarity >= 5) waterClarity = 'clear';
    else if (water.clarity >= 2) waterClarity = 'stained';
    else waterClarity = 'murky';
    
    let waterTemp: 'cold' | 'cool' | 'warm' | 'hot';
    if (water.seaSurfaceTemp < 60) waterTemp = 'cold';
    else if (water.seaSurfaceTemp < 70) waterTemp = 'cool';
    else if (water.seaSurfaceTemp < 85) waterTemp = 'warm';
    else waterTemp = 'hot';
    
    let timeOfDayCat: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';
    if (hour >= 5 && hour < 7) timeOfDayCat = 'dawn';
    else if (hour >= 7 && hour < 11) timeOfDayCat = 'morning';
    else if (hour >= 11 && hour < 14) timeOfDayCat = 'midday';
    else if (hour >= 14 && hour < 17) timeOfDayCat = 'afternoon';
    else if (hour >= 17 && hour < 19) timeOfDayCat = 'dusk';
    else timeOfDayCat = 'night';
    
    let season: 'spring' | 'summer' | 'fall' | 'winter';
    if (month >= 3 && month <= 5) season = 'spring';
    else if (month >= 6 && month <= 8) season = 'summer';
    else if (month >= 9 && month <= 11) season = 'fall';
    else season = 'winter';
    
    return {
      waterClarity,
      waterTemp,
      timeOfDay: timeOfDayCat,
      season,
    };
  }

  /**
   * Get baits for specific species
   */
  private getBaitForSpecies(species: string): BaitEntry[] {
    const speciesData = this.baitDatabase.get(species);
    if (speciesData) {
      return speciesData.baits;
    }
    
    // Return general baits if species not found
    return this.BAIT_DATA.slice(0, 8);
  }

  /**
   * Calculate effectiveness score for bait in current conditions
   */
  private calculateEffectivenessScore(bait: BaitEntry, conditions: any): number {
    let score = bait.effectiveness;
    
    // Condition matching bonus
    if (bait.bestConditions.clarity.includes(conditions.waterClarity)) {
      score += 10;
    }
    
    if (bait.bestConditions.temperature.includes(conditions.waterTemp)) {
      score += 10;
    }
    
    if (bait.bestConditions.timeOfDay.includes(conditions.timeOfDay)) {
      score += 10;
    }
    
    if (bait.bestConditions.season.includes(conditions.season)) {
      score += 5;
    }
    
    // Water clarity adjustments
    if (conditions.waterClarity === 'murky' && bait.colors.some(c => 
      c.includes('chartreuse') || c.includes('glow') || c.includes('bright')
    )) {
      score += 15;
    }
    
    if (conditions.waterClarity === 'clear' && bait.colors.some(c => 
      c.includes('natural') || c.includes('pearl') || c.includes('bone')
    )) {
      score += 10;
    }
    
    // Temperature adjustments for presentation speed
    if (conditions.waterTemp === 'cold' && bait.retrievalSpeed === 'slow') {
      score += 10;
    }
    
    if (conditions.waterTemp === 'hot' && bait.retrievalSpeed === 'fast') {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Create bait recommendation object
   */
  private createRecommendation(
    bait: BaitEntry,
    species: string,
    conditions: any,
    score: number
  ): BaitRecommendation {
    const reasoning = this.generateReasoning(bait, conditions, score);
    
    return {
      id: crypto.randomUUID(),
      baitType: bait.type,
      baitName: bait.name,
      category: bait.category,
      effectivenessScore: score,
      confidence: Math.min(1.0, score / 100),
      targetSpecies: [species],
      conditions,
      presentation: bait.presentation,
      retrievalSpeed: bait.retrievalSpeed,
      color: bait.colors,
      size: bait.sizes[0], // Primary size
      reasoning,
      recentSuccess: false, // Will be updated by community learning
      communityRating: 0, // Will be updated by community learning
      priceRange: bait.priceRange,
      whereToBuy: ['Local Bait Shop', 'Academy Sports', 'Bass Pro Shops'],
    };
  }

  /**
   * Generate reasoning for recommendation
   */
  private generateReasoning(bait: BaitEntry, conditions: any, score: number): string {
    let reasoning = `${bait.name} is highly effective (${score}/100) because `;
    
    if (bait.naturalPrey) {
      reasoning += `it's ${bait.naturalPrey}. `;
    }
    
    if (conditions.waterClarity === 'murky' && bait.colors.some(c => c.includes('chartreuse'))) {
      reasoning += 'Chartreuse color provides excellent visibility in murky water. ';
    }
    
    if (conditions.waterTemp === 'cold' && bait.retrievalSpeed === 'slow') {
      reasoning += 'Slow presentation matches fish metabolism in cold water. ';
    }
    
    if (conditions.timeOfDay === 'dawn' && bait.category === 'Topwater') {
      reasoning += 'Topwater action is deadly during low-light conditions. ';
    }
    
    return reasoning;
  }

  /**
   * Apply community learning to recommendations
   */
  private applyCommunityLearning(
    recommendations: BaitRecommendation[],
    location: string,
    conditions: any
  ): BaitRecommendation[] {
    const recentReports = this.communityReports.filter(report => 
      report.location === location && 
      this.areConditionsSimilar(report.conditions, conditions) &&
      new Date(report.date) >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // Last 14 days
    );
    
    const baitStats = new Map<string, {
      successCount: number;
      totalRating: number;
      reportCount: number;
    }>();
    
    recentReports.forEach(report => {
      const stats = baitStats.get(report.bait) || {
        successCount: 0,
        totalRating: 0,
        reportCount: 0,
      };
      
      stats.successCount += report.success.fishCaught > 0 ? 1 : 0;
      stats.totalRating += report.success.rating;
      stats.reportCount += 1;
      
      baitStats.set(report.bait, stats);
    });
    
    // Update recommendations with community data
    recommendations.forEach(rec => {
      const stats = baitStats.get(rec.baitName);
      if (stats && stats.reportCount >= 3) {
        rec.recentSuccess = true;
        rec.communityRating = stats.totalRating / stats.reportCount;
        
        // Boost score if recent success
        if (stats.successCount / stats.reportCount > 0.7) {
          rec.effectivenessScore += 10;
          rec.confidence = Math.min(1.0, rec.confidence + 0.1);
        }
      }
    });
    
    return recommendations;
  }

  /**
   * Check if conditions are similar for community learning
   */
  private areConditionsSimilar(reportConditions: any, currentConditions: any): boolean {
    // Simplified similarity check
    return (
      reportConditions.water.clarity >= currentConditions.waterClarity - 2 &&
      reportConditions.water.clarity <= currentConditions.waterClarity + 2 &&
      Math.abs(reportConditions.water.seaSurfaceTemp - currentConditions.waterTemp) <= 10
    );
  }

  /**
   * Get bait database statistics
   */
  public getDatabaseStats(): {
    totalBaits: number;
    totalSpecies: number;
    communityReports: number;
    lastUpdated: string;
  } {
    return {
      totalBaits: this.BAIT_DATA.length,
      totalSpecies: this.baitDatabase.size,
      communityReports: this.communityReports.length,
      lastUpdated: this.lastUpdated,
    };
  }

  /**
   * Get seasonal bait recommendations
   */
  public getSeasonalRecommendations(season: string): BaitRecommendation[] {
    const seasonBaits = this.BAIT_DATA.filter(bait => 
      bait.bestConditions.season.includes(season as any)
    );
    
    return seasonBaits.slice(0, 5).map(bait => ({
      id: crypto.randomUUID(),
      baitType: bait.type,
      baitName: bait.name,
      category: bait.category,
      effectivenessScore: bait.effectiveness,
      confidence: 0.8,
      targetSpecies: ['redfish', 'speckled trout'],
      conditions: {
        waterClarity: 'clear',
        waterTemp: 'warm',
        timeOfDay: 'morning',
        season: season as any,
      },
      presentation: bait.presentation,
      retrievalSpeed: bait.retrievalSpeed,
      color: bait.colors,
      size: bait.sizes[0],
      reasoning: `Top choice for ${season} fishing in the Gulf Coast`,
      recentSuccess: false,
      communityRating: 0,
      priceRange: bait.priceRange,
      whereToBuy: ['Local Bait Shop', 'Academy Sports'],
    }));
  }
}

export default BaitRecommendations;
