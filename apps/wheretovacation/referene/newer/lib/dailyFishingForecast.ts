/**
 * Daily Fishing Forecast - "My Morning Briefing"
 * 
 * Personalized daily fishing report delivered every morning at 6 AM local time
 * via push notification and email. Makes GCC the first app users check.
 * 
 * Content Includes:
 * 1. Today's Fishing Forecast: 5-star activity rating for user's home waters
 * 2. Best Times: Solunar major/minor periods with countdown timers
 * 3. What's Biting: Top 3 species active today based on reports
 * 4. Hot Bait: What's working according to recent catches
 * 5. Tide Times: High/low tides for user's preferred spots
 * 6. Weather: Wind, waves, temperature, barometric pressure
 * 7. Community Highlights: "Yesterday, 47 anglers caught redfish in your area"
 * 8. Pro Tip of the Day: Rotating fishing techniques and knowledge
 */

import { FishActivityPredictions, FishActivityPrediction } from './fishActivityPredictions';
import { SolunarTables, SolunarDay } from './solunarTables';
import { TideDataIntegration, TideData } from './tideDataIntegration';
import { BaitRecommendations, BaitRecommendation } from './baitRecommendations';
import { FishSpeciesDatabase, FishSpecies } from './fishSpeciesDatabase';

export interface UserPreferences {
  userId: string;
  homeWaters: {
    locationId: string;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  }[];
  targetSpecies: string[];
  deliveryTime: string; // HH:MM format
  deliveryMethods: ('push' | 'email' | 'sms')[];
  notifications: {
    forecast: boolean;
    solunar: boolean;
    weather: boolean;
    community: boolean;
    proTips: boolean;
  };
}

export interface DailyForecast {
  userId: string;
  date: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  overallRating: {
    score: number;
    stars: string;
    quality: 'excellent' | 'good' | 'fair' | 'slow' | 'poor';
    description: string;
    color: string;
  };
  fishingForecast: FishActivityPrediction;
  solunarData: {
    majorPeriods: SolunarPeriod[];
    minorPeriods: SolunarPeriod[];
    dayRating: number;
    moonPhase: string;
    bestTimes: string[];
  };
  tideData: {
    highTides: TideTime[];
    lowTides: TideTime[];
    currentStatus: string;
    fishingWindows: FishingWindow[];
  };
  weather: {
    temperature: number;
    windSpeed: number;
    windDirection: number;
    barometricPressure: number;
    waveHeight: number;
    conditions: string;
    outlook: string;
  };
  speciesActivity: SpeciesActivity[];
  hotBaits: BaitRecommendation[];
  communityHighlights: CommunityHighlight[];
  proTip: ProTip;
  generatedAt: string;
  nextForecast: string;
}

export interface SolunarPeriod {
  type: 'major' | 'minor';
  start: string;
  end: string;
  peak: string;
  rating: number;
  description: string;
  countdown?: string;
}

export interface TideTime {
  time: string;
  height: number;
  type: 'high' | 'low';
  countdown?: string;
}

export interface FishingWindow {
  start: string;
  end: string;
  quality: 'excellent' | 'good' | 'fair';
  description: string;
}

export interface SpeciesActivity {
  species: FishSpecies;
  activityLevel: number;
  confidence: number;
  bestTimes: string[];
  recommendedBaits: string[];
  notes: string;
}

export interface CommunityHighlight {
  type: 'catches' | 'tournaments' | 'milestones' | 'events';
  title: string;
  description: string;
  count?: number;
  location?: string;
  timestamp: string;
}

export interface ProTip {
  category: 'technique' | 'safety' | 'conservation' | 'gear' | 'weather';
  title: string;
  content: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  author?: string;
}

export interface ForecastDelivery {
  userId: string;
  forecastId: string;
  method: 'push' | 'email' | 'sms';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: string;
  error?: string;
}

export class DailyFishingForecast {
  private static instance: DailyFishingForecast;
  private fishActivityPredictions: FishActivityPredictions;
  private solunarTables: SolunarTables;
  private tideDataIntegration: TideDataIntegration;
  private baitRecommendations: BaitRecommendations;
  private fishSpeciesDatabase: FishSpeciesDatabase;
  
  private userPreferences: Map<string, UserPreferences> = new Map();
  private forecastCache: Map<string, DailyForecast> = new Map();
  private deliveryQueue: ForecastDelivery[] = [];

  // Pro tips database
  private readonly PRO_TIPS: ProTip[] = [
    {
      category: 'technique',
      title: 'The Walking Retrieve',
      content: 'When fishing topwater lures, use a "walk-the-dog" retrieve: twitch the rod tip down while reeling slack, creating a side-to-side action that drives fish crazy.',
      difficulty: 'intermediate',
    },
    {
      category: 'weather',
      title: 'Barometric Pressure Basics',
      content: 'Fishing is best when barometric pressure is 29.8-30.2 inches. Falling pressure often triggers feeding, while rapidly rising pressure can make fish lethargic.',
      difficulty: 'beginner',
    },
    {
      category: 'safety',
      title: 'Lightning Safety',
      content: 'If you can hear thunder, you\'re close enough to be struck by lightning. Seek shelter immediately in a building or vehicle - open water is extremely dangerous during storms.',
      difficulty: 'beginner',
    },
    {
      category: 'conservation',
      title: 'Catch and Release Best Practices',
      content: 'Keep fish in water as much as possible, use wet hands, use barbless hooks, and revive fish by moving them forward to force water over gills before release.',
      difficulty: 'intermediate',
    },
    {
      category: 'gear',
      title: 'Line Maintenance',
      content: 'Check your line for nicks and abrasions after every trip. Re-tie knots regularly and replace line every 3-6 months for optimal performance.',
      difficulty: 'beginner',
    },
    {
      category: 'technique',
      title: 'Reading the Tide',
      content: 'Fish are most active during tide changes. Focus on the 2 hours before and after high/low tide - this is when predators feed most aggressively.',
      difficulty: 'intermediate',
    },
    {
      category: 'weather',
      title: 'Wind Direction Matters',
      content: 'East wind is often least favorable for fishing. West and south winds typically bring better conditions. North winds can be good but often bring cooler water.',
      difficulty: 'advanced',
    },
    {
      category: 'technique',
      title: 'The Pause That Counts',
      content: 'When using soft plastics, add a 2-3 second pause after each twitch. Many fish strike during this pause when the bait looks most natural.',
      difficulty: 'intermediate',
    },
  ];

  public static getInstance(): DailyFishingForecast {
    if (!DailyFishingForecast.instance) {
      DailyFishingForecast.instance = new DailyFishingForecast();
    }
    return DailyFishingForecast.instance;
  }

  private constructor() {
    this.fishActivityPredictions = FishActivityPredictions.getInstance();
    this.solunarTables = SolunarTables.getInstance();
    this.tideDataIntegration = TideDataIntegration.getInstance();
    this.baitRecommendations = BaitRecommendations.getInstance();
    this.fishSpeciesDatabase = FishSpeciesDatabase.getInstance();
    
    this.startDailyGeneration();
  }

  /**
   * Generate daily forecast for user
   */
  public async generateForecast(userId: string, date?: Date): Promise<DailyForecast> {
    const targetDate = date || new Date();
    const dateStr = targetDate.toDateString();
    
    // Check cache first
    const cacheKey = `${userId}_${dateStr}`;
    if (this.forecastCache.has(cacheKey)) {
      return this.forecastCache.get(cacheKey)!;
    }

    const preferences = this.getUserPreferences(userId);
    const primaryLocation = preferences.homeWaters[0]; // Use primary home waters
    
    if (!primaryLocation) {
      throw new Error('User must have at least one home waters location set');
    }

    // Generate all forecast components
    const fishingForecast = await this.generateFishingForecast(primaryLocation, targetDate, preferences.targetSpecies);
    const solunarData = await this.generateSolunarData(primaryLocation, targetDate);
    const tideData = await this.generateTideData(primaryLocation, targetDate);
    const weather = await this.generateWeatherData(primaryLocation, targetDate);
    const speciesActivity = await this.generateSpeciesActivity(primaryLocation, targetDate, preferences.targetSpecies);
    const hotBaits = await this.generateHotBaits(primaryLocation, targetDate, preferences.targetSpecies);
    const communityHighlights = await this.generateCommunityHighlights(primaryLocation, targetDate);
    const proTip = this.getRandomProTip();

    // Calculate overall rating
    const overallRating = this.calculateOverallRating(fishingForecast, solunarData, weather);

    const forecast: DailyForecast = {
      userId,
      date: dateStr,
      location: {
        name: primaryLocation.name,
        latitude: primaryLocation.latitude,
        longitude: primaryLocation.longitude,
        timezone: primaryLocation.timezone,
      },
      overallRating,
      fishingForecast,
      solunarData,
      tideData,
      weather,
      speciesActivity,
      hotBaits,
      communityHighlights,
      proTip,
      generatedAt: new Date().toISOString(),
      nextForecast: this.getNextForecastDate(targetDate).toISOString(),
    };

    // Cache for 1 hour
    this.forecastCache.set(cacheKey, forecast);
    setTimeout(() => this.forecastCache.delete(cacheKey), 60 * 60 * 1000);

    return forecast;
  }

  /**
   * Set user preferences
   */
  public setUserPreferences(userId: string, preferences: Partial<UserPreferences>): void {
    const existing = this.userPreferences.get(userId) || {
      userId,
      homeWaters: [],
      targetSpecies: ['redfish', 'speckled_trout'],
      deliveryTime: '06:00',
      deliveryMethods: ['push', 'email'],
      notifications: {
        forecast: true,
        solunar: true,
        weather: true,
        community: true,
        proTips: true,
      },
    };

    this.userPreferences.set(userId, { ...existing, ...preferences });
  }

  /**
   * Get user preferences
   */
  public getUserPreferences(userId: string): UserPreferences {
    return this.userPreferences.get(userId) || {
      userId,
      homeWaters: [],
      targetSpecies: ['redfish', 'speckled_trout'],
      deliveryTime: '06:00',
      deliveryMethods: ['push', 'email'],
      notifications: {
        forecast: true,
        solunar: true,
        weather: true,
        community: true,
        proTips: true,
      },
    };
  }

  /**
   * Schedule forecast delivery for user
   */
  public scheduleDelivery(userId: string): void {
    const preferences = this.getUserPreferences(userId);
    const [hours, minutes] = preferences.deliveryTime.split(':').map(Number);
    
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If scheduled time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    console.log(`Forecast scheduled for user ${userId} at ${scheduledTime.toISOString()}`);
    
    // In production, this would use a job scheduler like Bull Queue or Cron
    setTimeout(() => {
      this.deliverForecast(userId);
    }, scheduledTime.getTime() - now.getTime());
  }

  /**
   * Deliver forecast to user
   */
  public async deliverForecast(userId: string): Promise<void> {
    try {
      const forecast = await this.generateForecast(userId);
      const preferences = this.getUserPreferences(userId);
      
      const deliveries: Promise<void>[] = [];
      
      if (preferences.deliveryMethods.includes('push')) {
        deliveries.push(this.sendPushNotification(userId, forecast));
      }
      
      if (preferences.deliveryMethods.includes('email')) {
        deliveries.push(this.sendEmail(userId, forecast));
      }
      
      if (preferences.deliveryMethods.includes('sms')) {
        deliveries.push(this.sendSMS(userId, forecast));
      }
      
      await Promise.all(deliveries);
      
      // Schedule next delivery
      this.scheduleDelivery(userId);
      
    } catch (error) {
      console.error(`Failed to deliver forecast to user ${userId}:`, error);
    }
  }

  /**
   * Get forecast summary for quick view
   */
  public async getForecastSummary(userId: string): Promise<{
    overallRating: string;
    bestTimes: string[];
    topSpecies: string[];
    weatherBrief: string;
    keyTakeaway: string;
  }> {
    const forecast = await this.generateForecast(userId);
    
    return {
      overallRating: `${forecast.overallRating.stars} (${forecast.overallRating.quality})`,
      bestTimes: forecast.solunarData.bestTimes.slice(0, 3),
      topSpecies: forecast.speciesActivity.slice(0, 3).map(s => s.species.commonName),
      weatherBrief: `${forecast.weather.temperature}°F, ${forecast.weather.conditions}, ${forecast.weather.windSpeed}mph wind`,
      keyTakeaway: forecast.overallRating.description,
    };
  }

  /**
   * Private helper methods
   */
  private async generateFishingForecast(
    location: any,
    date: Date,
    targetSpecies: string[]
  ): Promise<FishActivityPrediction> {
    // Mock weather and water conditions
    const weather = {
      barometricPressure: 30.1,
      windSpeed: 8,
      windDirection: 180,
      cloudCover: 30,
      airTemperature: 75,
      humidity: 70,
      precipitation: 0,
    };

    const water = {
      seaSurfaceTemp: 78,
      salinity: 20,
      clarity: 5,
      waveHeight: 1.5,
      currentSpeed: 1.2,
    };

    const tideData = await this.tideDataIntegration.getTideData('8735180', 7);
    const moonPhase = this.calculateMoonPhase(date);
    
    return this.fishActivityPredictions.predictActivity(
      location.locationId,
      date.toISOString(),
      weather,
      water,
      tideData,
      moonPhase,
      targetSpecies
    );
  }

  private async generateSolunarData(location: any, date: Date): Promise<any> {
    const solunarDay = await this.solunarTables.calculateSolunarDay(
      date,
      location.latitude,
      location.longitude,
      location.timezone
    );

    return {
      majorPeriods: solunarDay.periods.filter(p => p.type === 'major'),
      minorPeriods: solunarDay.periods.filter(p => p.type === 'minor'),
      dayRating: solunarDay.dayRating.score,
      moonPhase: solunarDay.moon.phaseName,
      bestTimes: solunarDay.periods
        .filter(p => p.rating >= 70)
        .map(p => `${new Date(p.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(p.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`),
    };
  }

  private async generateTideData(location: any, date: Date): Promise<any> {
    const tideData = await this.tideDataIntegration.getTideData('8735180', 7);
    const todayStr = date.toDateString();
    
    const todayTides = tideData.predictions.filter(p => 
      new Date(p.datetime).toDateString() === todayStr
    );

    const highTides = todayTides.filter(t => t.tideType === 'high').map(t => ({
      time: new Date(t.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      height: t.height,
      type: 'high' as const,
    }));

    const lowTides = todayTides.filter(t => t.tideType === 'low').map(t => ({
      time: new Date(t.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      height: t.height,
      type: 'low' as const,
    }));

    return {
      highTides,
      lowTides,
      currentStatus: tideData.currentStatus.status,
      fishingWindows: tideData.fishingWindows
        .filter(w => new Date(w.start).toDateString() === todayStr)
        .map(w => ({
          start: new Date(w.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          end: new Date(w.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quality: w.quality,
          description: w.description,
        })),
    };
  }

  private async generateWeatherData(location: any, date: Date): Promise<any> {
    // Mock weather data - in production, integrate with weather API
    return {
      temperature: 75 + Math.floor(Math.random() * 10),
      windSpeed: 5 + Math.floor(Math.random() * 10),
      windDirection: Math.floor(Math.random() * 360),
      barometricPressure: 29.8 + Math.random() * 0.6,
      waveHeight: 0.5 + Math.random() * 2,
      conditions: ['Sunny', 'Partly Cloudy', 'Cloudy'][Math.floor(Math.random() * 3)],
      outlook: 'Fishing conditions look favorable with light winds and stable pressure.',
    };
  }

  private async generateSpeciesActivity(
    location: any,
    date: Date,
    targetSpecies: string[]
  ): Promise<SpeciesActivity[]> {
    const activities: SpeciesActivity[] = [];
    
    for (const speciesId of targetSpecies) {
      const species = this.fishSpeciesDatabase.getSpecies(speciesId);
      if (!species) continue;
      
      activities.push({
        species,
        activityLevel: 70 + Math.floor(Math.random() * 30),
        confidence: 0.8 + Math.random() * 0.2,
        bestTimes: ['Morning', 'Evening'],
        recommendedBaits: species.fishing.bestBaits.slice(0, 3),
        notes: `Good activity expected during tide changes.`,
      });
    }
    
    return activities.sort((a, b) => b.activityLevel - a.activityLevel).slice(0, 3);
  }

  private async generateHotBaits(
    location: any,
    date: Date,
    targetSpecies: string[]
  ): Promise<BaitRecommendation[]> {
    // Mock bait recommendations
    return [
      {
        id: '1',
        baitType: 'live',
        baitName: 'Live Shrimp',
        category: 'Crustacean',
        effectivenessScore: 95,
        confidence: 0.9,
        targetSpecies: ['redfish', 'speckled trout'],
        conditions: {
          waterClarity: 'clear',
          waterTemp: 'warm',
          timeOfDay: 'morning',
          season: 'spring',
        },
        presentation: 'Popping cork or Carolina rig',
        retrievalSpeed: 'slow',
        color: ['natural'],
        size: 'medium',
        reasoning: 'Excellent all-around choice for Gulf Coast species.',
        recentSuccess: true,
        communityRating: 4.5,
        priceRange: { min: 8, max: 15 },
        whereToBuy: ['Local Bait Shop'],
      },
    ];
  }

  private async generateCommunityHighlights(location: any, date: Date): Promise<CommunityHighlight[]> {
    // Mock community data
    return [
      {
        type: 'catches',
        title: 'Local Action',
        description: 'Yesterday, 47 anglers caught redfish in your area',
        count: 47,
        location: location.name,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  private getRandomProTip(): ProTip {
    return this.PRO_TIPS[Math.floor(Math.random() * this.PRO_TIPS.length)];
  }

  private calculateOverallRating(
    fishingForecast: FishActivityPrediction,
    solunarData: any,
    weather: any
  ): any {
    const baseScore = fishingForecast.activityScore;
    const solunarBonus = solunarData.dayRating > 80 ? 10 : solunarData.dayRating > 60 ? 5 : 0;
    const weatherBonus = weather.windSpeed < 10 ? 5 : weather.windSpeed < 15 ? 0 : -10;
    
    const finalScore = Math.max(0, Math.min(100, baseScore + solunarBonus + weatherBonus));
    
    let stars = '⭐';
    let quality: 'excellent' | 'good' | 'fair' | 'slow' | 'poor';
    let description: string;
    let color: string;
    
    if (finalScore >= 90) {
      stars = '⭐⭐⭐⭐⭐';
      quality = 'excellent';
      description = 'Exceptional fishing conditions - get on the water!';
      color = '#10b981';
    } else if (finalScore >= 70) {
      stars = '⭐⭐⭐⭐';
      quality = 'good';
      description = 'Great conditions for fishing success';
      color = '#3b82f6';
    } else if (finalScore >= 50) {
      stars = '⭐⭐⭐';
      quality = 'fair';
      description = 'Average conditions - fish smart';
      color = '#f59e0b';
    } else if (finalScore >= 30) {
      stars = '⭐⭐';
      quality = 'slow';
      description = 'Challenging conditions - patience required';
      color = '#f97316';
    } else {
      stars = '⭐';
      quality = 'poor';
      description = 'Tough conditions - consider another day';
      color = '#ef4444';
    }
    
    return {
      score: finalScore,
      stars,
      quality,
      description,
      color,
    };
  }

  private calculateMoonPhase(date: Date): any {
    // Simple moon phase calculation
    const phase = (date.getDate() / 30) % 1;
    return {
      phase,
      phaseName: phase < 0.25 ? 'new' : phase < 0.5 ? 'waxing_crescent' : 'first_quarter',
      illumination: phase * 100,
    };
  }

  private getNextForecastDate(date: Date): Date {
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  private async sendPushNotification(userId: string, forecast: DailyForecast): Promise<void> {
    // Mock push notification
    console.log(`Push notification sent to ${userId}: ${forecast.overallRating.stars} fishing today!`);
  }

  private async sendEmail(userId: string, forecast: DailyForecast): Promise<void> {
    // Mock email sending
    console.log(`Email sent to ${userId}: Daily Fishing Forecast for ${forecast.date}`);
  }

  private async sendSMS(userId: string, forecast: DailyForecast): Promise<void> {
    // Mock SMS sending
    console.log(`SMS sent to ${userId}: ${forecast.overallRating.stars} fishing today!`);
  }

  private startDailyGeneration(): void {
    // Generate forecasts for all users at their preferred times
    // In production, this would use a proper job scheduler
    setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      for (const [userId, preferences] of this.userPreferences.entries()) {
        if (preferences.deliveryTime === currentTime) {
          this.deliverForecast(userId);
        }
      }
    }, 60 * 1000); // Check every minute
  }
}

export default DailyFishingForecast;
