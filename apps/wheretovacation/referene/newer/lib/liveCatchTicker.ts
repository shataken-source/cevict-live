/**
 * Live Catch Ticker & Real-time Notifications System
 *
 * Creates immediate urgency and social proof through real-time fishing activity.
 * Displays live catches, bookings, and community actions to drive engagement.
 *
 * Features:
 * - Real-time catch ticker with species, weight, location
 * - Live booking notifications and captain availability
 * - Social proof through community activity feed
 * - FOMO-driven booking conversion optimization
 * - Mobile-responsive ticker and side-panel views
 * - WebSocket integration for real-time updates
 * - Geographic filtering for relevant catches
 * - Trust level highlighting for veteran users
 */

import { EventEmitter } from 'events';

export interface LiveCatch {
  id: string;
  captainId: string;
  captainName: string;
  captainAvatar: string;
  captainTrustLevel: 'new' | 'verified' | 'veteran' | 'elite';
  species: string;
  weight: number; // in pounds
  location: {
    name: string;
    distance: string; // e.g., "2 miles out"
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  timestamp: Date;
  charterId?: string;
  photos?: string[];
  weather?: {
    condition: string;
    temperature: number;
    windSpeed: number;
  };
  bait?: string;
  technique?: string;
}

export interface LiveActivity {
  id: string;
  type: 'catch' | 'booking' | 'review' | 'photo' | 'tournament_entry';
  userId: string;
  userName: string;
  userAvatar: string;
  userTrustLevel: string;
  action: string;
  details: string;
  location?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TickerConfig {
  position: 'header' | 'sidebar' | 'floating';
  speed: 'slow' | 'normal' | 'fast';
  showPhotos: boolean;
  showLocation: boolean;
  filterRadius: number; // miles
  categories: ('catch' | 'booking' | 'review' | 'photo')[];
  maxItems: number;
}

export interface TickerAnalytics {
  impressions: number;
  clicks: number;
  bookingsFromTicker: number;
  topSpecies: Array<{ species: string; count: number }>;
  peakHours: Array<{ hour: number; activity: number }>;
  conversionRate: number;
}

class LiveCatchTicker extends EventEmitter {
  private activities: LiveActivity[] = [];
  private catches: LiveCatch[] = [];
  private config: TickerConfig;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private analytics: TickerAnalytics;

  constructor(config: Partial<TickerConfig> = {}) {
    super();
    
    this.config = {
      position: 'header',
      speed: 'normal',
      showPhotos: true,
      showLocation: true,
      filterRadius: 50,
      categories: ['catch', 'booking', 'review'],
      maxItems: 20,
      ...config
    };

    this.analytics = {
      impressions: 0,
      clicks: 0,
      bookingsFromTicker: 0,
      topSpecies: [],
      peakHours: [],
      conversionRate: 0
    };

    this.initializeWebSocket();
    this.startPeriodicCleanup();
  }

  /**
   * Initialize WebSocket connection for real-time updates
   */
  private initializeWebSocket(): void {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080/live-ticker';
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('Live ticker WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeUpdate(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('Live ticker WebSocket disconnected');
        this.attemptReconnect();
        this.emit('disconnected');
      };

      this.websocket.onerror = (error) => {
        console.error('Live ticker WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      // Fallback to polling
      this.startPolling();
    }
  }

  /**
   * Attempt to reconnect WebSocket connection
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        console.log(`Attempting ticker reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.initializeWebSocket();
      }, delay);
    } else {
      console.log('Max reconnection attempts reached, falling back to polling');
      this.startPolling();
    }
  }

  /**
   * Fallback polling mechanism
   */
  private startPolling(): void {
    setInterval(async () => {
      try {
        const updates = await this.fetchRecentActivity();
        updates.forEach(update => this.handleRealtimeUpdate(update));
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 30000); // Poll every 30 seconds
  }

  /**
   * Handle real-time updates from WebSocket or polling
   */
  private handleRealtimeUpdate(data: any): void {
    if (data.type === 'catch') {
      this.addCatch(data as LiveCatch);
    } else if (data.type === 'activity') {
      this.addActivity(data as LiveActivity);
    }

    this.emit('update', data);
  }

  /**
   * Add a new catch to the ticker
   */
  public addCatch(catch: LiveCatch): void {
    // Validate catch data
    if (!this.validateCatch(catch)) {
      return;
    }

    // Add to beginning of array
    this.catches.unshift(catch);

    // Keep only recent catches (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.catches = this.catches.filter(c => new Date(c.timestamp) > twentyFourHoursAgo);

    // Limit to max items
    if (this.catches.length > this.config.maxItems) {
      this.catches = this.catches.slice(0, this.config.maxItems);
    }

    // Update analytics
    this.updateAnalytics('catch', catch);

    // Emit event
    this.emit('catch_added', catch);
  }

  /**
   * Add a new activity to the feed
   */
  public addActivity(activity: LiveActivity): void {
    // Filter by configured categories
    if (!this.config.categories.includes(activity.type as any)) {
      return;
    }

    // Add to beginning of array
    this.activities.unshift(activity);

    // Keep only recent activities (last 6 hours)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    this.activities = this.activities.filter(a => new Date(a.timestamp) > sixHoursAgo);

    // Limit to max items
    if (this.activities.length > this.config.maxItems) {
      this.activities = this.activities.slice(0, this.config.maxItems);
    }

    // Emit event
    this.emit('activity_added', activity);
  }

  /**
   * Get formatted ticker items for display
   */
  public getTickerItems(): string[] {
    const items: string[] = [];

    // Add recent catches
    this.catches.slice(0, 10).forEach(catch_ => {
      const trustBadge = catch_.captainTrustLevel === 'veteran' || catch_.captainTrustLevel === 'elite' 
        ? '⭐' : '';
      
      const location = this.config.showLocation && catch_.location 
        ? ` ${catch_.location.distance} out` : '';
      
      items.push(`${trustBadge}Captain ${catch_.captainName} just landed a ${catch_.weight}lb ${catch_.species}${location}!`);
    });

    // Add recent bookings
    const recentBookings = this.activities
      .filter(a => a.type === 'booking')
      .slice(0, 5);

    recentBookings.forEach(booking => {
      items.push(`🎣 ${booking.userName} just booked a trip!`);
    });

    // Add recent reviews
    const recentReviews = this.activities
      .filter(a => a.type === 'review')
      .slice(0, 3);

    recentReviews.forEach(review => {
      items.push(`⭐ ${review.userName} left a 5-star review!`);
    });

    return items;
  }

  /**
   * Get detailed activity feed
   */
  public getActivityFeed(limit: number = 20): LiveActivity[] {
    return this.activities.slice(0, limit);
  }

  /**
   * Get recent catches with location filtering
   */
  public getRecentCatches(userLocation?: { lat: number; lng: number }, limit: number = 10): LiveCatch[] {
    let filteredCatches = this.catches;

    // Filter by radius if user location provided
    if (userLocation) {
      filteredCatches = filteredCatches.filter(catch_ => {
        if (!catch_.location.coordinates) return true;
        
        const distance = this.calculateDistance(
          userLocation.lat,
          userLocation.lng,
          catch_.location.coordinates.lat,
          catch_.location.coordinates.lng
        );
        
        return distance <= this.config.filterRadius;
      });
    }

    return filteredCatches.slice(0, limit);
  }

  /**
   * Calculate distance between two coordinates (miles)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Validate catch data
   */
  private validateCatch(catch: LiveCatch): boolean {
    return !!(
      catch.id &&
      catch.captainId &&
      catch.captainName &&
      catch.species &&
      catch.weight > 0 &&
      catch.timestamp
    );
  }

  /**
   * Update analytics data
   */
  private updateAnalytics(type: string, data: any): void {
    if (type === 'catch') {
      // Update top species
      const speciesIndex = this.analytics.topSpecies.findIndex(s => s.species === data.species);
      if (speciesIndex >= 0) {
        this.analytics.topSpecies[speciesIndex].count++;
      } else {
        this.analytics.topSpecies.push({ species: data.species, count: 1 });
      }

      // Sort by count
      this.analytics.topSpecies.sort((a, b) => b.count - a.count);
      
      // Keep only top 10
      this.analytics.topSpecies = this.analytics.topSpecies.slice(0, 10);
    }

    // Update peak hours
    const hour = new Date().getHours();
    const hourIndex = this.analytics.peakHours.findIndex(h => h.hour === hour);
    if (hourIndex >= 0) {
      this.analytics.peakHours[hourIndex].activity++;
    } else {
      this.analytics.peakHours.push({ hour, activity: 1 });
    }
  }

  /**
   * Record ticker impression
   */
  public recordImpression(): void {
    this.analytics.impressions++;
  }

  /**
   * Record ticker click
   */
  public recordClick(type: 'catch' | 'booking' | 'review'): void {
    this.analytics.clicks++;
    
    if (type === 'booking') {
      this.analytics.bookingsFromTicker++;
    }

    // Update conversion rate
    if (this.analytics.impressions > 0) {
      this.analytics.conversionRate = (this.analytics.bookingsFromTicker / this.analytics.impressions) * 100;
    }
  }

  /**
   * Get analytics data
   */
  public getAnalytics(): TickerAnalytics {
    return { ...this.analytics };
  }

  /**
   * Fetch recent activity from API
   */
  private async fetchRecentActivity(): Promise<any[]> {
    try {
      const response = await fetch('/api/live-ticker/recent');
      if (!response.ok) throw new Error('Failed to fetch activity');
      return await response.json();
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * Start periodic cleanup of old data
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const now = new Date();
      
      // Clean old catches (older than 24 hours)
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      this.catches = this.catches.filter(c => new Date(c.timestamp) > twentyFourHoursAgo);

      // Clean old activities (older than 6 hours)
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      this.activities = this.activities.filter(a => new Date(a.timestamp) > sixHoursAgo);
    }, 60 * 60 * 1000); // Clean every hour
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<TickerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', this.config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): TickerConfig {
    return { ...this.config };
  }

  /**
   * Destroy ticker and cleanup resources
   */
  public destroy(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.removeAllListeners();
  }
}

// Singleton instance
export const liveCatchTicker = new LiveCatchTicker();

export default LiveCatchTicker;
