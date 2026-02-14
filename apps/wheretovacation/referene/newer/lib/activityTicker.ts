/**
 * Activity Ticker & Real-time Notifications System
 * 
 * Updated from Live Catch Ticker to support ALL charter types including:
 * - Fishing catches and tournaments
 * - Dolphin sightings and wildlife encounters
 * - Scuba diving discoveries
 * - Sunset cruise photos
 * - Wedding celebrations
 * - Corporate events
 * - Watersports achievements
 * - And all other Gulf Coast watercraft activities
 */

import { EventEmitter } from 'eventemitter3';
import { CharterType, CharterCategory } from '../../../lib/charterTypes';

export interface LiveActivity {
  id: string;
  type: ActivityType;
  charterType: CharterType;
  charterId: string;
  captainId: string;
  captainName: string;
  vesselName: string;
  
  // Activity-specific data
  activityData: {
    // Fishing
    species?: string;
    weight?: number;
    length?: number;
    fishingMethod?: string;
    
    // Wildlife
    wildlifeType?: string;
    count?: number;
    behavior?: string;
    
    // Diving
    depth?: number;
    diveSite?: string;
    visibility?: number;
    discoveries?: string[];
    
    // Events
    eventType?: string;
    guestCount?: number;
    highlights?: string[];
    
    // Watersports
    sport?: string;
    achievement?: string;
    duration?: number;
    
    // General
    description?: string;
    photos?: string[];
    videos?: string[];
  };
  
  // Location
  location: {
    lat: number;
    lng: number;
    area: string;
    coordinates?: string;
  };
  
  // Timing
  timestamp: Date;
  duration?: number;
  
  // Social
  userId?: string;
  userName?: string;
  userTrustLevel?: string;
  likes: number;
  comments: number;
  shares: number;
  
  // Visibility
  isPublic: boolean;
  isVerified: boolean;
  featured: boolean;
  
  // Weather/Conditions
  conditions?: {
    weather: string;
    temperature: number;
    windSpeed: number;
    waveHeight: number;
  };
}

export enum ActivityType {
  // Fishing
  CATCH_CAUGHT = 'catch_caught',
  TOURNAMENT_WIN = 'tournament_win',
  PERSONAL_BEST = 'personal_best',
  
  // Wildlife
  DOLPHIN_SIGHTING = 'dolphin_sighting',
  WHALE_SIGHTING = 'whale_sighting',
  TURTLE_ENCOUNTER = 'turtle_encounter',
  BIRD_WATCHING = 'bird_watching',
  
  // Diving
  DIVE_COMPLETED = 'dive_completed',
  REEF_DISCOVERY = 'reef_discovery',
  WRECK_EXPLORED = 'wreck_explored',
  MARINE_LIFE_SPOTTED = 'marine_life_spotted',
  
  // Events
  WEDDING_CELEBRATION = 'wedding_celebration',
  CORPORATE_SUCCESS = 'corporate_success',
  BACHELOR_PARTY = 'bachelor_party',
  BIRTHDAY_CELEBRATION = 'birthday_celebration',
  
  // Leisure
  SUNSET_CAPTURED = 'sunset_captured',
  BOOZE_CRUISE_FUN = 'booze_cruise_fun',
  ROMANTIC_EVENING = 'romantic_evening',
  
  // Watersports
  TUBING_FUN = 'tubing_fun',
  PARASAILING_SOAR = 'parasailing_soar',
  JET_SKI_ADVENTURE = 'jet_ski_adventure',
  
  // Educational
  LESSON_COMPLETED = 'lesson_completed',
  CERTIFICATION_EARNED = 'certification_earned',
  SAFETY_DRILL = 'safety_drill',
  
  // General
  CHARTER_STARTED = 'charter_started',
  CHARTER_COMPLETED = 'charter_completed',
  MILESTONE_REACHED = 'milestone_reached',
  SPECIAL_MOMENT = 'special_moment'
}

export interface TickerConfig {
  maxItems: number;
  refreshInterval: number;
  includePhotos: boolean;
  includeVideos: boolean;
  filterByLocation: boolean;
  filterByCharterType: boolean;
  showVerifiedOnly: boolean;
  enableRealTime: boolean;
  animationSpeed: number;
}

export interface TickerAnalytics {
  totalActivities: number;
  activitiesByType: Record<ActivityType, number>;
  activitiesByCharterType: Record<string, number>;
  topCaptains: Array<{
    captainId: string;
    captainName: string;
    activityCount: number;
  }>;
  peakActivityHours: Array<{
    hour: number;
    count: number;
  }>;
  engagementMetrics: {
    averageLikes: number;
    averageComments: number;
    averageShares: number;
  };
}

class ActivityTicker extends EventEmitter {
  private activities: LiveActivity[] = [];
  private config: TickerConfig;
  private websocket: WebSocket | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private subscribers: Map<string, (activities: LiveActivity[]) => void> = new Map();

  constructor(config: Partial<TickerConfig> = {}) {
    super();
    
    this.config = {
      maxItems: 50,
      refreshInterval: 30000, // 30 seconds
      includePhotos: true,
      includeVideos: true,
      filterByLocation: false,
      filterByCharterType: false,
      showVerifiedOnly: false,
      enableRealTime: true,
      animationSpeed: 5000,
      ...config
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load initial activities
      await this.loadRecentActivities();
      
      // Start real-time updates if enabled
      if (this.config.enableRealTime) {
        this.connectWebSocket();
      }
      
      // Start periodic refresh
      this.startPeriodicRefresh();
      
    } catch (error) {
      console.error('Error initializing Activity Ticker:', error);
    }
  }

  /**
   * Add a new activity to the ticker
   */
  public async addActivity(activityData: Omit<LiveActivity, 'id' | 'timestamp' | 'likes' | 'comments' | 'shares'>): Promise<LiveActivity> {
    try {
      const activity: LiveActivity = {
        ...activityData,
        id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        likes: 0,
        comments: 0,
        shares: 0
      };

      // Add to beginning of array
      this.activities.unshift(activity);
      
      // Maintain max items limit
      if (this.activities.length > this.config.maxItems) {
        this.activities = this.activities.slice(0, this.config.maxItems);
      }

      // Emit events
      this.emit('activity_added', activity);
      this.emit('activities_updated', this.getFilteredActivities());

      // Broadcast to subscribers
      this.broadcastToSubscribers();

      return activity;

    } catch (error) {
      console.error('Error adding activity:', error);
      throw error;
    }
  }

  /**
   * Get filtered activities based on config
   */
  public getFilteredActivities(): LiveActivity[] {
    let filtered = [...this.activities];

    // Filter by verification status
    if (this.config.showVerifiedOnly) {
      filtered = filtered.filter(activity => activity.isVerified);
    }

    // Filter by charter type if specified
    if (this.config.filterByCharterType) {
      // This would be implemented based on user preferences
    }

    // Filter by location if specified
    if (this.config.filterByLocation) {
      // This would be implemented based on user location
    }

    return filtered;
  }

  /**
   * Get activities by type
   */
  public getActivitiesByType(type: ActivityType): LiveActivity[] {
    return this.activities.filter(activity => activity.type === type);
  }

  /**
   * Get activities by charter category
   */
  public getActivitiesByCategory(category: CharterCategory): LiveActivity[] {
    return this.activities.filter(activity => activity.charterType.category === category);
  }

  /**
   * Get activities by captain
   */
  public getActivitiesByCaptain(captainId: string): LiveActivity[] {
    return this.activities.filter(activity => activity.captainId === captainId);
  }

  /**
   * Like an activity
   */
  public async likeActivity(activityId: string, userId: string): Promise<void> {
    const activity = this.activities.find(a => a.id === activityId);
    if (activity) {
      activity.likes++;
      this.emit('activity_liked', { activityId, userId, likes: activity.likes });
      this.broadcastToSubscribers();
    }
  }

  /**
   * Comment on an activity
   */
  public async commentOnActivity(activityId: string, userId: string, comment: string): Promise<void> {
    const activity = this.activities.find(a => a.id === activityId);
    if (activity) {
      activity.comments++;
      this.emit('activity_commented', { activityId, userId, comment, comments: activity.comments });
      this.broadcastToSubscribers();
    }
  }

  /**
   * Share an activity
   */
  public async shareActivity(activityId: string, userId: string): Promise<void> {
    const activity = this.activities.find(a => a.id === activityId);
    if (activity) {
      activity.shares++;
      this.emit('activity_shared', { activityId, userId, shares: activity.shares });
      this.broadcastToSubscribers();
    }
  }

  /**
   * Subscribe to activity updates
   */
  public subscribe(callback: (activities: LiveActivity[]) => void): string {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.subscribers.set(subscriptionId, callback);
    callback(this.getFilteredActivities());
    return subscriptionId;
  }

  /**
   * Unsubscribe from activity updates
   */
  public unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId);
  }

  /**
   * Get ticker analytics
   */
  public getAnalytics(): TickerAnalytics {
    const activitiesByType = {} as Record<ActivityType, number>;
    const activitiesByCharterType = {} as Record<string, number>;
    const captainCounts = new Map<string, { name: string; count: number }>();
    const hourlyActivity = new Array(24).fill(0);

    this.activities.forEach(activity => {
      // Count by type
      activitiesByType[activity.type] = (activitiesByType[activity.type] || 0) + 1;
      
      // Count by charter type
      const charterTypeName = activity.charterType.name;
      activitiesByCharterType[charterTypeName] = (activitiesByCharterType[charterTypeName] || 0) + 1;
      
      // Count by captain
      const captainCount = captainCounts.get(activity.captainId) || { name: activity.captainName, count: 0 };
      captainCount.count++;
      captainCounts.set(activity.captainId, captainCount);
      
      // Count by hour
      const hour = activity.timestamp.getHours();
      hourlyActivity[hour]++;
    });

    const topCaptains = Array.from(captainCounts.entries())
      .map(([id, data]) => ({ captainId: id, captainName: data.name, activityCount: data.count }))
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, 10);

    const peakActivityHours = hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const engagementMetrics = {
      averageLikes: this.activities.length > 0 ? 
        this.activities.reduce((sum, a) => sum + a.likes, 0) / this.activities.length : 0,
      averageComments: this.activities.length > 0 ? 
        this.activities.reduce((sum, a) => sum + a.comments, 0) / this.activities.length : 0,
      averageShares: this.activities.length > 0 ? 
        this.activities.reduce((sum, a) => sum + a.shares, 0) / this.activities.length : 0
    };

    return {
      totalActivities: this.activities.length,
      activitiesByType,
      activitiesByCharterType,
      topCaptains,
      peakActivityHours,
      engagementMetrics
    };
  }

  /**
   * Load recent activities from server
   */
  private async loadRecentActivities(): Promise<void> {
    try {
      // Mock implementation - would fetch from API
      const mockActivities: LiveActivity[] = [
        {
          id: 'activity-1',
          type: ActivityType.CATCH_CAUGHT,
          charterType: {
            id: 'deep_sea_fishing',
            name: 'Deep Sea Fishing',
            category: CharterCategory.FISHING,
            subcategory: 'deep_sea_fishing' as any,
            description: 'Offshore fishing adventures',
            icon: 'fish',
            features: [],
            typicalDuration: 8,
            capacityRange: { min: 1, max: 6 },
            priceRange: { min: 800, max: 2000 },
            seasonalAvailability: 'spring_summer' as any,
            targetAudience: [],
            waterType: 'gulf_coast' as any,
            vesselTypes: []
          },
          charterId: 'charter-1',
          captainId: 'captain-1',
          captainName: 'Captain Mike',
          vesselName: 'Sea Eagle',
          activityData: {
            species: 'Red Snapper',
            weight: 15,
            length: 32,
            description: 'Beautiful catch on the deep sea!'
          },
          location: {
            lat: 30.2949,
            lng: -87.7435,
            area: 'Gulf Shores'
          },
          timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
          userId: 'user-1',
          userName: 'John Doe',
          userTrustLevel: 'veteran',
          likes: 12,
          comments: 3,
          shares: 1,
          isPublic: true,
          isVerified: true,
          featured: true,
          conditions: {
            weather: 'Sunny',
            temperature: 75,
            windSpeed: 10,
            waveHeight: 2
          }
        },
        {
          id: 'activity-2',
          type: ActivityType.DOLPHIN_SIGHTING,
          charterType: {
            id: 'dolphin_tour',
            name: 'Dolphin Watching Tour',
            category: CharterCategory.LEISURE,
            subcategory: 'dolphin_tours' as any,
            description: 'Get up close with dolphins',
            icon: 'dolphin',
            features: [],
            typicalDuration: 2,
            capacityRange: { min: 10, max: 50 },
            priceRange: { min: 25, max: 60 },
            seasonalAvailability: 'spring_summer' as any,
            targetAudience: [],
            waterType: 'coastal' as any,
            vesselTypes: []
          },
          charterId: 'charter-2',
          captainId: 'captain-2',
          captainName: 'Captain Sarah',
          vesselName: 'Dolphin Dream',
          activityData: {
            wildlifeType: 'Bottlenose Dolphin',
            count: 8,
            behavior: 'Jumping and playing',
            description: 'Amazing dolphin pod today!'
          },
          location: {
            lat: 30.2879,
            lng: -87.7585,
            area: 'Orange Beach'
          },
          timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
          userId: 'user-2',
          userName: 'Jane Smith',
          userTrustLevel: 'verified',
          likes: 25,
          comments: 8,
          shares: 3,
          isPublic: true,
          isVerified: true,
          featured: false,
          conditions: {
            weather: 'Partly Cloudy',
            temperature: 72,
            windSpeed: 8,
            waveHeight: 1
          }
        },
        {
          id: 'activity-3',
          type: ActivityType.SUNSET_CAPTURED,
          charterType: {
            id: 'sunset_cruise',
            name: 'Sunset Cruise',
            category: CharterCategory.LEISURE,
            subcategory: 'sunset_cruises' as any,
            description: 'Romantic evening cruise',
            icon: 'sunset',
            features: [],
            typicalDuration: 2,
            capacityRange: { min: 2, max: 12 },
            priceRange: { min: 200, max: 500 },
            seasonalAvailability: 'year_round' as any,
            targetAudience: [],
            waterType: 'coastal' as any,
            vesselTypes: []
          },
          charterId: 'charter-3',
          captainId: 'captain-3',
          captainName: 'Captain Tom',
          vesselName: 'Golden Hour',
          activityData: {
            description: 'Perfect sunset with golden colors!',
            photos: ['sunset-photo-1.jpg']
          },
          location: {
            lat: 30.2460,
            lng: -87.7046,
            area: 'Gulf Shores Public Beach'
          },
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          userId: 'user-3',
          userName: 'Romantic Couple',
          userTrustLevel: 'new',
          likes: 18,
          comments: 5,
          shares: 2,
          isPublic: true,
          isVerified: true,
          featured: false,
          conditions: {
            weather: 'Clear',
            temperature: 68,
            windSpeed: 5,
            waveHeight: 0.5
          }
        }
      ];

      this.activities = mockActivities;
      this.emit('activities_loaded', this.activities);

    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  private connectWebSocket(): void {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_ACTIVITY_WS || 'ws://localhost:8080/activities';
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('Activity Ticker WebSocket connected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_activity') {
            this.addActivity(data.activity);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('Activity Ticker WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connectWebSocket(), 5000);
      };

      this.websocket.onerror = (error) => {
        console.error('Activity Ticker WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error connecting WebSocket:', error);
    }
  }

  /**
   * Start periodic refresh
   */
  private startPeriodicRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      this.loadRecentActivities();
    }, this.config.refreshInterval);
  }

  /**
   * Broadcast updates to all subscribers
   */
  private broadcastToSubscribers(): void {
    const filteredActivities = this.getFilteredActivities();
    this.subscribers.forEach(callback => {
      try {
        callback(filteredActivities);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<TickerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.broadcastToSubscribers();
    this.emit('config_updated', this.config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): TickerConfig {
    return { ...this.config };
  }

  /**
   * Destroy the ticker
   */
  public destroy(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.subscribers.clear();
    this.removeAllListeners();
  }
}

export default ActivityTicker;
