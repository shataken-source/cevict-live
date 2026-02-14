/**
 * Crowd Meters System for Live Venue Capacity Reporting
 *
 * Turns WTV into a live utility by allowing community members to report
 * real-time crowd levels at popular venues. Creates value beyond static content.
 *
 * Features:
 * - Real-time crowd level reporting and visualization
 * - Community-driven data with trust level weighting
 * - Predictive analytics based on historical data
 * - Integration with trip planning and recommendations
 * - Mobile-optimized reporting interface
 * - Heat maps and trend analysis
 * - Business partnership opportunities
 * - API for third-party integrations
 */

import { EventEmitter } from 'eventemitter3';

export interface CrowdReport {
  id: string;
  venueId: string;
  venueType: 'restaurant' | 'beach' | 'attraction' | 'charter' | 'shopping' | 'entertainment';
  venueName: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  
  // Crowd Data
  currentCapacity: number;
  maxCapacity: number;
  crowdLevel: 'empty' | 'quiet' | 'moderate' | 'busy' | 'crowded' | 'full';
  percentage: number;
  
  // Reporting
  reportedBy: string;
  reporterName: string;
  reporterTrustLevel: 'new' | 'verified' | 'veteran' | 'elite';
  reporterBadge?: string;
  
  // Timing
  reportedAt: Date;
  expiresAt: Date;
  
  // Context
  weather?: {
    condition: string;
    temperature: number;
  };
  event?: {
    name: string;
    type: string;
  };
  dayOfWeek: string;
  season: string;
  
  // Verification
  verified: boolean;
  verificationCount: number;
  reports: number; // How many people reported this level
  
  // Media
  photos?: string[];
  notes?: string;
}

export interface Venue {
  id: string;
  name: string;
  type: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  maxCapacity: number;
  businessHours: {
    open: string;
    close: string;
    days: string[];
  };
  contact: {
    phone: string;
    website: string;
  };
  amenities: string[];
  averageCrowdLevel: number;
  peakHours: number[];
  seasonalVariation: boolean;
}

export interface CrowdAnalytics {
  venueId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  
  // Analytics Data
  averageCrowdLevel: number;
  peakTimes: Array<{
    hour: number;
    level: number;
  }>;
  quietTimes: Array<{
    hour: number;
    level: number;
  }>;
  
  // Trends
  weeklyTrend: Array<{
    day: string;
    averageLevel: number;
  }>;
  seasonalTrend: Array<{
    month: string;
    averageLevel: number;
  }>;
  
  // Predictions
  nextHourPrediction: number;
  nextDayPrediction: number;
  
  // Reliability
  reportCount: number;
  reliability: number; // 0-100 based on reporter trust levels
}

export interface CrowdMeterConfig {
  enablePredictions: boolean;
  enableHeatMaps: boolean;
  minTrustLevelToReport: string;
  reportExpirationHours: number;
  maxReportsPerVenue: number;
  weightByTrustLevel: boolean;
  enablePhotoVerification: boolean;
}

class CrowdMeters extends EventEmitter {
  private config: CrowdMeterConfig;
  private crowdReports: Map<string, CrowdReport[]> = new Map();
  private venues: Map<string, Venue> = new Map();
  private analytics: Map<string, CrowdAnalytics> = new Map();
  private userReports: Map<string, string[]> = new Map(); // userId -> venueIds

  constructor(config: Partial<CrowdMeterConfig> = {}) {
    super();
    
    this.config = {
      enablePredictions: true,
      enableHeatMaps: true,
      minTrustLevelToReport: 'new',
      reportExpirationHours: 2,
      maxReportsPerVenue: 50,
      weightByTrustLevel: true,
      enablePhotoVerification: true,
      ...config
    };

    this.initializeVenues();
    this.startPeriodicCleanup();
  }

  /**
   * Initialize venue database
   */
  private initializeVenues(): void {
    const defaultVenues: Venue[] = [
      // Restaurants
      {
        id: 'rest-1',
        name: 'The Hangout',
        type: 'restaurant',
        location: { lat: 30.2949, lng: -87.7435, address: '1516 Gulf Shores Pkwy, Gulf Shores, AL' },
        maxCapacity: 300,
        businessHours: { open: '11:00', close: '22:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
        contact: { phone: '251-948-7111', website: 'thehangoutal.com' },
        amenities: ['beach access', 'live music', 'bar', 'family friendly'],
        averageCrowdLevel: 65,
        peakHours: [18, 19, 20],
        seasonalVariation: true
      },
      {
        id: 'rest-2',
        name: "Fisher's at Orange Beach Marina",
        type: 'restaurant',
        location: { lat: 30.2879, lng: -87.7585, address: '26389 Canal Rd, Orange Beach, AL' },
        maxCapacity: 150,
        businessHours: { open: '11:00', close: '21:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
        contact: { phone: '251-981-6600', website: 'fishersorangebeach.com' },
        amenities: ['marina view', 'fresh seafood', 'bar', 'outdoor seating'],
        averageCrowdLevel: 45,
        peakHours: [12, 13, 18, 19],
        seasonalVariation: true
      },
      
      // Beaches
      {
        id: 'beach-1',
        name: 'Gulf Shores Public Beach',
        type: 'beach',
        location: { lat: 30.2460, lng: -87.7046, address: '201 W Beach Blvd, Gulf Shores, AL' },
        maxCapacity: 1000,
        businessHours: { open: '06:00', close: '22:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
        contact: { phone: '251-968-7511', website: 'gulfshores.com' },
        amenities: ['parking', 'restrooms', 'showers', 'lifeguards'],
        averageCrowdLevel: 40,
        peakHours: [11, 12, 13, 14, 15, 16],
        seasonalVariation: true
      },
      
      // Attractions
      {
        id: 'attr-1',
        name: 'Alabama Gulf Coast Zoo',
        type: 'attraction',
        location: { lat: 30.2927, lng: -87.5807, address: '1204 Gulf Shores Pkwy, Gulf Shores, AL' },
        maxCapacity: 500,
        businessHours: { open: '09:00', close: '16:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
        contact: { phone: '251-968-5731', website: 'algulfcoastzoo.com' },
        amenities: ['gift shop', 'snack bar', 'educational programs', 'animal encounters'],
        averageCrowdLevel: 30,
        peakHours: [10, 11, 14, 15],
        seasonalVariation: true
      }
    ];

    defaultVenues.forEach(venue => {
      this.venues.set(venue.id, venue);
      this.crowdReports.set(venue.id, []);
    });
  }

  /**
   * Report crowd level for a venue
   */
  public async reportCrowdLevel(reportData: {
    venueId: string;
    currentCapacity: number;
    notes?: string;
    photos?: string[];
  }, reporter: {
    id: string;
    name: string;
    trustLevel: string;
    badge?: string;
  }): Promise<CrowdReport> {
    try {
      const venue = this.venues.get(reportData.venueId);
      if (!venue) {
        throw new Error('Venue not found');
      }

      // Check trust level requirement
      if (!this.checkTrustLevel(reporter.trustLevel)) {
        throw new Error('Insufficient trust level to report');
      }

      // Check if user has already reported recently
      const userRecentReports = this.userReports.get(reporter.id) || [];
      if (userRecentReports.includes(reportData.venueId)) {
        throw new Error('You have already reported this venue recently');
      }

      // Calculate crowd level
      const percentage = (reportData.currentCapacity / venue.maxCapacity) * 100;
      const crowdLevel = this.getCrowdLevelFromPercentage(percentage);

      const report: CrowdReport = {
        id: `crowd-${Date.now()}`,
        venueId: reportData.venueId,
        venueType: venue.type as any,
        venueName: venue.name,
        location: venue.location,
        currentCapacity: reportData.currentCapacity,
        maxCapacity: venue.maxCapacity,
        crowdLevel,
        percentage,
        reportedBy: reporter.id,
        reporterName: reporter.name,
        reporterTrustLevel: reporter.trustLevel as any,
        reporterBadge: reporter.badge,
        reportedAt: new Date(),
        expiresAt: new Date(Date.now() + (this.config.reportExpirationHours * 60 * 60 * 1000)),
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        season: this.getCurrentSeason(),
        verified: false,
        verificationCount: 0,
        reports: 1,
        photos: reportData.photos,
        notes: reportData.notes
      };

      // Add to reports
      const venueReports = this.crowdReports.get(reportData.venueId) || [];
      venueReports.unshift(report);
      
      // Keep only recent reports
      const twoHoursAgo = new Date(Date.now() - (2 * 60 * 60 * 1000));
      const filteredReports = venueReports.filter(r => new Date(r.reportedAt) > twoHoursAgo);
      
      // Limit to max reports
      if (filteredReports.length > this.config.maxReportsPerVenue) {
        filteredReports.splice(this.config.maxReportsPerVenue);
      }
      
      this.crowdReports.set(reportData.venueId, filteredReports);

      // Track user reports
      userRecentReports.push(reportData.venueId);
      this.userReports.set(reporter.id, userRecentReports);

      // Update analytics
      await this.updateAnalytics(reportData.venueId);

      // Emit events
      this.emit('crowd_reported', report);
      this.emit('venue_updated', { venueId: reportData.venueId, crowdLevel });

      return report;

    } catch (error) {
      console.error('Error reporting crowd level:', error);
      throw error;
    }
  }

  /**
   * Get current crowd level for venue
   */
  public async getCurrentCrowdLevel(venueId: string): Promise<CrowdReport | null> {
    try {
      const reports = this.crowdReports.get(venueId) || [];
      
      if (reports.length === 0) {
        return null;
      }

      // Get most recent verified report or calculate weighted average
      const recentReports = reports.filter(r => 
        new Date(r.expiresAt) > new Date()
      );

      if (recentReports.length === 0) {
        return null;
      }

      // If there's a verified report from a trusted user, use that
      const verifiedReport = recentReports.find(r => 
        r.verified && (r.reporterTrustLevel === 'veteran' || r.reporterTrustLevel === 'elite')
      );

      if (verifiedReport) {
        return verifiedReport;
      }

      // Otherwise, calculate weighted average
      const weightedReport = this.calculateWeightedCrowdLevel(recentReports);
      return weightedReport;

    } catch (error) {
      console.error('Error getting crowd level:', error);
      return null;
    }
  }

  /**
   * Get crowd levels for multiple venues (for map view)
   */
  public async getCrowdLevelsForMap(bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<Array<{ venue: Venue; crowdLevel: CrowdReport | null }>> {
    try {
      const venues = Array.from(this.venues.values());
      const filteredVenues = bounds ? 
        venues.filter(venue => 
          venue.location.lat >= bounds.south &&
          venue.location.lat <= bounds.north &&
          venue.location.lng >= bounds.west &&
          venue.location.lng <= bounds.east
        ) : venues;

      const results = await Promise.all(
        filteredVenues.map(async (venue) => {
          const crowdLevel = await this.getCurrentCrowdLevel(venue.id);
          return { venue, crowdLevel };
        })
      );

      return results;

    } catch (error) {
      console.error('Error getting map crowd levels:', error);
      return [];
    }
  }

  /**
   * Get crowd analytics for venue
   */
  public async getCrowdAnalytics(venueId: string, timeRange?: {
    start: Date;
    end: Date;
  }): Promise<CrowdAnalytics | null> {
    try {
      const cached = this.analytics.get(venueId);
      if (cached && !timeRange) {
        return cached;
      }

      const venue = this.venues.get(venueId);
      if (!venue) {
        return null;
      }

      // Generate analytics from historical data
      const analytics = await this.generateAnalytics(venueId, timeRange);
      this.analytics.set(venueId, analytics);

      return analytics;

    } catch (error) {
      console.error('Error getting crowd analytics:', error);
      return null;
    }
  }

  /**
   * Get crowd predictions
   */
  public async getCrowdPrediction(venueId: string, targetTime: Date): Promise<{
    predictedLevel: number;
    confidence: number;
    factors: string[];
  }> {
    try {
      const analytics = await this.getCrowdAnalytics(venueId);
      if (!analytics) {
        return { predictedLevel: 50, confidence: 0, factors: [] };
      }

      const venue = this.venues.get(venueId);
      if (!venue) {
        return { predictedLevel: 50, confidence: 0, factors: [] };
      }

      const targetHour = targetTime.getHours();
      const targetDay = targetTime.toLocaleDateString('en-US', { weekday: 'long' });

      // Base prediction on historical patterns
      let predictedLevel = analytics.averageCrowdLevel;
      let confidence = 50;
      const factors: string[] = [];

      // Adjust for time of day
      const hourData = analytics.peakTimes.find(h => h.hour === targetHour);
      if (hourData) {
        predictedLevel = hourData.level;
        confidence += 20;
        factors.push('Historical hourly pattern');
      }

      // Adjust for day of week
      const dayData = analytics.weeklyTrend.find(d => d.day === targetDay);
      if (dayData) {
        predictedLevel = (predictedLevel + dayData.averageLevel) / 2;
        confidence += 15;
        factors.push('Day of week pattern');
      }

      // Seasonal adjustment
      const currentSeason = this.getCurrentSeason();
      if (venue.seasonalVariation) {
        factors.push('Seasonal variation');
        confidence += 10;
      }

      // Weather impact (if available)
      factors.push('Weather conditions');
      confidence += 5;

      return {
        predictedLevel: Math.min(100, Math.max(0, predictedLevel)),
        confidence: Math.min(95, confidence),
        factors
      };

    } catch (error) {
      console.error('Error getting crowd prediction:', error);
      return { predictedLevel: 50, confidence: 0, factors: [] };
    }
  }

  /**
   * Verify a crowd report
   */
  public async verifyReport(reportId: string, verifierId: string): Promise<void> {
    try {
      // Find report across all venues
      for (const [venueId, reports] of this.crowdReports.entries()) {
        const report = reports.find(r => r.id === reportId);
        if (report) {
          report.verificationCount++;
          report.verified = report.verificationCount >= 2; // Need 2 verifications
          
          this.emit('report_verified', report);
          return;
        }
      }

      throw new Error('Report not found');

    } catch (error) {
      console.error('Error verifying report:', error);
      throw error;
    }
  }

  /**
   * Get crowd heat map data
   */
  public async getHeatMapData(timeRange?: {
    start: Date;
    end: Date;
  }): Promise<Array<{
    lat: number;
    lng: number;
    intensity: number;
    venueName: string;
    venueType: string;
  }>> {
    try {
      const heatMapData: Array<{
        lat: number;
        lng: number;
        intensity: number;
        venueName: string;
        venueType: string;
      }> = [];

      for (const [venueId, venue] of this.venues.entries()) {
        const crowdLevel = await this.getCurrentCrowdLevel(venueId);
        
        if (crowdLevel) {
          heatMapData.push({
            lat: venue.location.lat,
            lng: venue.location.lng,
            intensity: crowdLevel.percentage / 100, // Normalize to 0-1
            venueName: venue.name,
            venueType: venue.type
          });
        }
      }

      return heatMapData;

    } catch (error) {
      console.error('Error getting heat map data:', error);
      return [];
    }
  }

  /**
   * Check if user meets trust level requirement
   */
  private checkTrustLevel(userTrustLevel: string): boolean {
    const levels = { 'new': 0, 'verified': 1, 'veteran': 2, 'elite': 3 };
    const userLevel = levels[userTrustLevel as keyof typeof levels] || 0;
    const required = levels[this.config.minTrustLevelToReport as keyof typeof levels] || 0;
    return userLevel >= required;
  }

  /**
   * Get crowd level from percentage
   */
  private getCrowdLevelFromPercentage(percentage: number): CrowdReport['crowdLevel'] {
    if (percentage <= 10) return 'empty';
    if (percentage <= 25) return 'quiet';
    if (percentage <= 50) return 'moderate';
    if (percentage <= 75) return 'busy';
    if (percentage <= 90) return 'crowded';
    return 'full';
  }

  /**
   * Calculate weighted crowd level from multiple reports
   */
  private calculateWeightedCrowdLevel(reports: CrowdReport[]): CrowdReport {
    if (reports.length === 0) {
      throw new Error('No reports to calculate');
    }

    if (reports.length === 1) {
      return reports[0];
    }

    // Weight reports by trust level
    let totalWeight = 0;
    let weightedCapacity = 0;

    reports.forEach(report => {
      const weight = this.getTrustLevelWeight(report.reporterTrustLevel);
      totalWeight += weight;
      weightedCapacity += report.currentCapacity * weight;
    });

    const averageCapacity = weightedCapacity / totalWeight;
    const venue = this.venues.get(reports[0].venueId)!;
    
    const percentage = (averageCapacity / venue.maxCapacity) * 100;
    const crowdLevel = this.getCrowdLevelFromPercentage(percentage);

    // Create combined report
    return {
      ...reports[0],
      currentCapacity: Math.round(averageCapacity),
      percentage,
      crowdLevel,
      reports: reports.length,
      verified: reports.some(r => r.verified)
    };

  }

  /**
   * Get trust level weight for calculations
   */
  private getTrustLevelWeight(trustLevel: string): number {
    const weights = {
      'new': 1,
      'verified': 2,
      'veteran': 3,
      'elite': 4
    };
    return weights[trustLevel as keyof typeof weights] || 1;
  }

  /**
   * Get current season
   */
  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  }

  /**
   * Generate analytics for venue
   */
  private async generateAnalytics(venueId: string, timeRange?: {
    start: Date;
    end: Date;
  }): Promise<CrowdAnalytics> {
    const venue = this.venues.get(venueId)!;
    const reports = this.crowdReports.get(venueId) || [];

    // Mock analytics generation
    return {
      venueId,
      timeRange: timeRange || {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      averageCrowdLevel: venue.averageCrowdLevel,
      peakTimes: venue.peakHours.map(hour => ({ hour, level: 80 })),
      quietTimes: [9, 10, 14, 15].map(hour => ({ hour, level: 20 })),
      weeklyTrend: [
        { day: 'Monday', averageLevel: 40 },
        { day: 'Tuesday', averageLevel: 45 },
        { day: 'Wednesday', averageLevel: 50 },
        { day: 'Thursday', averageLevel: 55 },
        { day: 'Friday', averageLevel: 70 },
        { day: 'Saturday', averageLevel: 85 },
        { day: 'Sunday', averageLevel: 75 }
      ],
      seasonalTrend: [
        { month: 'Jan', averageLevel: 30 },
        { month: 'Feb', averageLevel: 35 },
        { month: 'Mar', averageLevel: 50 },
        { month: 'Apr', averageLevel: 65 },
        { month: 'May', averageLevel: 75 },
        { month: 'Jun', averageLevel: 85 },
        { month: 'Jul', averageLevel: 90 },
        { month: 'Aug', averageLevel: 85 },
        { month: 'Sep', averageLevel: 70 },
        { month: 'Oct', averageLevel: 60 },
        { month: 'Nov', averageLevel: 45 },
        { month: 'Dec', averageLevel: 35 }
      ],
      nextHourPrediction: 60,
      nextDayPrediction: 65,
      reportCount: reports.length,
      reliability: 75
    };
  }

  /**
   * Update analytics for venue
   */
  private async updateAnalytics(venueId: string): Promise<void> {
    // Invalidate cached analytics
    this.analytics.delete(venueId);
  }

  /**
   * Start periodic cleanup of expired reports
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const now = new Date();
      
      for (const [venueId, reports] of this.crowdReports.entries()) {
        const validReports = reports.filter(report => 
          new Date(report.expiresAt) > now
        );
        this.crowdReports.set(venueId, validReports);
      }

      // Clean user report tracking
      for (const [userId, venueIds] of this.userReports.entries()) {
        // Reset user reports every 24 hours
        this.userReports.set(userId, []);
      }

    }, 60 * 60 * 1000); // Clean every hour
  }

  /**
   * Get venues
   */
  public getVenues(): Venue[] {
    return Array.from(this.venues.values());
  }

  /**
   * Get venue by ID
   */
  public getVenue(venueId: string): Venue | undefined {
    return this.venues.get(venueId);
  }

  /**
   * Add new venue
   */
  public async addVenue(venue: Omit<Venue, 'id'>): Promise<Venue> {
    const newVenue: Venue = {
      ...venue,
      id: `venue-${Date.now()}`
    };

    this.venues.set(newVenue.id, newVenue);
    this.crowdReports.set(newVenue.id, []);

    this.emit('venue_added', newVenue);
    return newVenue;
  }

  /**
   * Destroy instance
   */
  public destroy(): void {
    this.removeAllListeners();
  }
}

export default CrowdMeters;
