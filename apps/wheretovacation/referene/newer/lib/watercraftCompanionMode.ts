/**
 * Watercraft Companion Mode for All Gulf Coast Activities
 * 
 * Updated from "While Fishing" Companion Mode to support:
 * - Fishing charters (catch logging, gear tracking)
 * - Booze cruises (party coordination, drink requests)
 * - Dolphin tours (wildlife logging, photo opportunities)
 * - Scuba diving (dive logging, equipment tracking)
 * - Sunset cruises (photo moments, romantic features)
 * - Wedding charters (event coordination, guest management)
 * - Watersports (achievement tracking, safety monitoring)
 * - And all other watercraft activities
 */

import { EventEmitter } from 'eventemitter3';
import { CharterType, CharterCategory } from '../../../lib/charterTypes';

export interface CompanionSession {
  id: string;
  charterId: string;
  charterType: CharterType;
  userId: string;
  captainId: string;
  vesselName: string;
  
  // Timing
  startTime: Date;
  endTime?: Date;
  duration?: number;
  
  // Location
  currentLocation: {
    lat: number;
    lng: number;
    area: string;
  };
  
  // Activity-specific data
  activityData: {
    // Fishing
    catches?: Catch[];
    gearUsed?: GearItem[];
    
    // Events
    guestCount?: number;
    eventTimeline?: EventTimeline[];
    
    // Diving
    dives?: DiveLog[];
    equipment?: DiveEquipment[];
    
    // Wildlife
    sightings?: WildlifeSighting[];
    
    // General
    photos?: string[];
    videos?: string[];
    notes?: string;
  };
  
  // Communication
  messages: CompanionMessage[];
  
  // Weather & Conditions
  currentWeather: {
    condition: string;
    temperature: number;
    windSpeed: number;
    waveHeight: number;
    visibility?: number;
  };
  
  // Safety
  emergencyContacts: EmergencyContact[];
  safetyChecklist: SafetyChecklistItem[];
  
  // Stats
  tripStats: {
    distanceTraveled: number;
    fuelUsed?: number;
    messagesExchanged: number;
    photosTaken: number;
    activitiesCompleted: number;
  };
  
  // Status
  isActive: boolean;
  lastUpdate: Date;
}

export interface Catch {
  id: string;
  species: string;
  weight: number;
  length?: number;
  baitUsed?: string;
  technique?: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: Date;
  photo?: string;
  released: boolean;
  tagged?: boolean;
}

export interface EventTimeline {
  id: string;
  eventType: 'ceremony' | 'dinner' | 'dancing' | 'speech' | 'toast' | 'activity';
  title: string;
  description: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: 'scheduled' | 'in_progress' | 'completed';
  notes?: string;
  photos?: string[];
}

export interface DiveLog {
  id: string;
  diveNumber: number;
  location: string;
  depth: number;
  bottomTime: number;
  startTime: Date;
  endTime: Date;
  visibility: number;
  waterTemperature: number;
  equipment: string[];
  sightings?: string[];
  notes?: string;
  buddies?: string[];
}

export interface WildlifeSighting {
  id: string;
  species: string;
  count: number;
  behavior: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: Date;
  photos?: string[];
  notes?: string;
}

export interface GearItem {
  id: string;
  name: string;
  type: 'rod' | 'reel' | 'tackle' | 'dive_gear' | 'safety' | 'party' | 'event';
  status: 'available' | 'in_use' | 'maintenance';
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  lastUsed?: Date;
  notes?: string;
}

export interface DiveEquipment {
  id: string;
  name: string;
  type: 'regulator' | 'bcd' | 'tank' | 'wetsuit' | 'computer' | 'mask' | 'fins';
  size?: string;
  pressure?: number;
  lastInspection: Date;
  status: 'ready' | 'needs_service' | 'out_of_service';
}

export interface CompanionMessage {
  id: string;
  senderId: string;
  senderType: 'client' | 'captain' | 'crew';
  content: string;
  type: 'text' | 'supply_request' | 'emergency' | 'activity_update' | 'photo';
  timestamp: Date;
  read: boolean;
  metadata?: {
    requestType?: 'ice' | 'bait' | 'fuel' | 'restroom' | 'medical' | 'drinks' | 'food' | 'music';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    activityType?: string;
    location?: { lat: number; lng: number };
  };
}

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  relation?: string;
  isPrimary: boolean;
}

export interface SafetyChecklistItem {
  id: string;
  item: string;
  category: 'pre_departure' | 'ongoing' | 'emergency';
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
  notes?: string;
}

export interface WeatherAlert {
  id: string;
  type: 'storm' | 'wind' | 'lightning' | 'fog' | 'heat' | 'rough_seas';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  message: string;
  startTime: Date;
  endTime?: Date;
  recommendedAction: string;
}

export interface TripStats {
  catchesCount?: number;
  largestCatch?: number;
  eventsCompleted?: number;
  photosTaken?: number;
  messagesExchanged?: number;
  distanceTraveled?: number;
  fuelUsed?: number;
  activitiesCompleted?: number;
  guestSatisfaction?: number;
}

class WatercraftCompanionMode extends EventEmitter {
  private currentSession: CompanionSession | null = null;
  private messageSocket: WebSocket | null = null;
  private locationSocket: WebSocket | null = null;
  private weatherSocket: WebSocket | null = null;

  /**
   * Start companion session for any watercraft activity
   */
  public async startCompanionSession(
    charterId: string, 
    userId: string, 
    charterType: CharterType
  ): Promise<CompanionSession> {
    try {
      // Initialize session based on charter type
      const session = await this.initializeSession(charterId, userId, charterType);
      this.currentSession = session;

      // Connect to real-time services
      await this.connectToServices();

      // Start tracking
      this.startTracking();

      this.emit('session_started', session);
      return session;

    } catch (error) {
      console.error('Error starting companion session:', error);
      throw error;
    }
  }

  /**
   * Initialize session based on charter type
   */
  private async initializeSession(
    charterId: string, 
    userId: string, 
    charterType: CharterType
  ): Promise<CompanionSession> {
    const sessionId = `session-${Date.now()}`;
    
    // Base session data
    const baseSession = {
      id: sessionId,
      charterId,
      charterType,
      userId,
      captainId: 'captain-123', // Would come from charter data
      vesselName: 'Vessel Name', // Would come from charter data
      startTime: new Date(),
      currentLocation: { lat: 30.2949, lng: -87.7435, area: 'Gulf Shores' },
      messages: [],
      currentWeather: {
        condition: 'Sunny',
        temperature: 75,
        windSpeed: 10,
        waveHeight: 2
      },
      emergencyContacts: [],
      safetyChecklist: [],
      tripStats: {
        distanceTraveled: 0,
        messagesExchanged: 0,
        photosTaken: 0,
        activitiesCompleted: 0
      },
      isActive: true,
      lastUpdate: new Date()
    };

    // Add activity-specific data based on charter type
    const activityData = await this.initializeActivityData(charterType);
    
    return {
      ...baseSession,
      activityData
    };
  }

  /**
   * Initialize activity-specific data based on charter type
   */
  private async initializeActivityData(charterType: CharterType): Promise<any> {
    switch (charterType.category) {
      case CharterCategory.FISHING:
        return {
          catches: [],
          gearUsed: [],
          photos: [],
          notes: ''
        };

      case CharterCategory.LEISURE:
        if (charterType.subcategory === 'booze_cruises') {
          return {
            guestCount: 0,
            eventTimeline: [],
            photos: [],
            notes: '',
            musicPlaylist: [],
            drinkInventory: []
          };
        } else if (charterType.subcategory === 'dolphin_tours') {
          return {
            sightings: [],
            photos: [],
            videos: [],
            notes: '',
            speciesIdentified: []
          };
        } else if (charterType.subcategory === 'sunset_cruises') {
          return {
            photos: [],
            romanticMoments: [],
            notes: '',
            sunsetQuality: null
          };
        }
        break;

      case CharterCategory.ADVENTURE:
        if (charterType.subcategory === 'scuba_diving') {
          return {
            dives: [],
            equipment: [],
            photos: [],
            videos: [],
            notes: ''
          };
        }
        break;

      case CharterCategory.SPECIAL_EVENTS:
        return {
          guestCount: 0,
          eventTimeline: [],
          photos: [],
          videos: [],
          notes: '',
          vendorContacts: [],
          checklist: []
        };

      case CharterCategory.WATERSPORTS:
        return {
          photos: [],
          notes: '',
          equipmentUsed: []
        };

      default:
        return {
          photos: [],
          notes: ''
        };
    }

    return {
      photos: [],
      notes: ''
    };
  }

  /**
   * Log activity-specific data
   */
  public async logActivity(activityType: string, data: any): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active companion session');
    }

    try {
      switch (activityType) {
        case 'catch':
          await this.logCatch(data);
          break;
        case 'dive':
          await this.logDive(data);
          break;
        case 'sighting':
          await this.logWildlifeSighting(data);
          break;
        case 'event':
          await this.logEvent(data);
          break;
        case 'achievement':
          await this.logAchievement(data);
          break;
        case 'photo':
          await this.logPhoto(data);
          break;
        default:
          console.log('Unknown activity type:', activityType);
      }

      this.currentSession.tripStats.activitiesCompleted++;
      this.emit('activity_logged', { type: activityType, data });

    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  /**
   * Log fishing catch
   */
  private async logCatch(catchData: {
    species: string;
    weight: number;
    length?: number;
    photo?: string;
  }): Promise<void> {
    const newCatch: Catch = {
      id: `catch-${Date.now()}`,
      species: catchData.species,
      weight: catchData.weight,
      length: catchData.length,
      location: this.currentSession!.currentLocation,
      timestamp: new Date(),
      photo: catchData.photo,
      released: true
    };

    this.currentSession!.activityData.catches?.push(newCatch);
    this.emit('catch_logged', newCatch);
  }

  /**
   * Log scuba dive
   */
  private async logDive(diveData: {
    location: string;
    depth: number;
    bottomTime: number;
    visibility: number;
    equipment: string[];
  }): Promise<void> {
    const dive: DiveLog = {
      id: `dive-${Date.now()}`,
      diveNumber: (this.currentSession!.activityData.dives?.length || 0) + 1,
      location: diveData.location,
      depth: diveData.depth,
      bottomTime: diveData.bottomTime,
      startTime: new Date(),
      endTime: new Date(Date.now() + diveData.bottomTime * 60 * 1000),
      visibility: diveData.visibility,
      waterTemperature: this.currentSession!.currentWeather.temperature,
      equipment: diveData.equipment
    };

    this.currentSession!.activityData.dives?.push(dive);
    this.emit('dive_logged', dive);
  }

  /**
   * Log wildlife sighting
   */
  private async logWildlifeSighting(sightingData: {
    species: string;
    count: number;
    behavior: string;
    photo?: string;
  }): Promise<void> {
    const sighting: WildlifeSighting = {
      id: `sighting-${Date.now()}`,
      species: sightingData.species,
      count: sightingData.count,
      behavior: sightingData.behavior,
      location: this.currentSession!.currentLocation,
      timestamp: new Date(),
      photos: sightingData.photo ? [sightingData.photo] : []
    };

    this.currentSession!.activityData.sightings?.push(sighting);
    this.emit('wildlife_sighted', sighting);
  }

  /**
   * Log event milestone
   */
  private async logEvent(eventData: {
    eventType: string;
    title: string;
    description: string;
    photo?: string;
  }): Promise<void> {
    const event: EventTimeline = {
      id: `event-${Date.now()}`,
      eventType: eventData.eventType as any,
      title: eventData.title,
      description: eventData.description,
      scheduledTime: new Date(),
      actualTime: new Date(),
      status: 'completed',
      photos: eventData.photo ? [eventData.photo] : []
    };

    this.currentSession!.activityData.eventTimeline?.push(event);
    this.emit('event_logged', event);
  }

  /**
   * Log achievement
   */
  private async logAchievement(achievementData: {
    sport: string;
    achievement: string;
    duration?: number;
    photo?: string;
  }): Promise<void> {
    const achievement = {
      id: `achievement-${Date.now()}`,
      sport: achievementData.sport,
      achievement: achievementData.achievement,
      duration: achievementData.duration,
      timestamp: new Date(),
      photo: achievementData.photo
    };

    this.currentSession!.activityData.achievements?.push(achievement);
    this.emit('achievement_logged', achievement);
  }

  /**
   * Log photo
   */
  private async logPhoto(photoData: {
    url: string;
    caption?: string;
    location?: { lat: number; lng: number };
  }): Promise<void> {
    const photo = {
      id: `photo-${Date.now()}`,
      url: photoData.url,
      caption: photoData.caption,
      location: photoData.location || this.currentSession!.currentLocation,
      timestamp: new Date()
    };

    this.currentSession!.activityData.photos?.push(photo.url);
    this.currentSession!.tripStats.photosTaken++;
    this.emit('photo_logged', photo);
  }

  /**
   * Send message to captain with activity-specific requests
   */
  public async sendMessageToCaptain(
    content: string,
    type: 'text' | 'supply_request' | 'emergency' | 'activity_update' | 'photo' = 'text',
    requestType?: 'ice' | 'bait' | 'fuel' | 'restroom' | 'medical' | 'drinks' | 'food' | 'music'
  ): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active companion session');
    }

    try {
      const message: CompanionMessage = {
        id: `msg-${Date.now()}`,
        senderId: this.currentSession.userId,
        senderType: 'client',
        content,
        type,
        timestamp: new Date(),
        read: false,
        metadata: requestType && requestType !== 'photo' && requestType !== 'dive_support' ? 
          { requestType, priority: 'medium' as const } : undefined
      };

      // Add to session
      this.currentSession.messages.push(message);
      this.currentSession.tripStats.messagesExchanged += 1;

      // Send via WebSocket
      if (this.messageSocket) {
        this.messageSocket.send(JSON.stringify({
          type: 'message',
          data: message
        }));
      }

      // Handle automatic responses for specific requests
      if (type === 'supply_request') {
        await this.handleRequest(requestType);
      }

      this.emit('message_sent', message);

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Handle automatic responses for requests
   */
  private async handleRequest(requestType?: string): Promise<void> {
    if (!requestType) return;

    const responses: Record<string, string> = {
      'ice': "Captain: Coming with fresh ice right away! 🧊",
      'bait': "Captain: Checking the bait supply, what species are we targeting?",
      'fuel': "Captain: Fuel levels are good, we have plenty for the trip ⛽",
      'restroom': "Captain: We can make a quick stop at the nearest marina",
      'medical': "Captain: I have a full first aid kit, what do you need?",
      'drinks': "Captain: Drink service coming up! What's everyone having? 🍹",
      'food': "Captain: I can arrange for food delivery or snacks",
      'music': "Captain: Changing the music now, what's the vibe?"
    };

    const response = responses[requestType];
    if (response) {
      setTimeout(() => {
        this.simulateCaptainMessage(response);
      }, 2000);
    }
  }

  /**
   * Simulate captain message
   */
  private simulateCaptainMessage(content: string): void {
    const message: CompanionMessage = {
      id: `captain-msg-${Date.now()}`,
      senderId: 'captain-123',
      senderType: 'captain',
      content,
      type: 'text',
      timestamp: new Date(),
      read: false
    };

    if (this.currentSession) {
      this.currentSession.messages.push(message);
      this.emit('message_received', message);
    }
  }

  /**
   * Get activity-specific recommendations
   */
  public async getRecommendations(): Promise<string[]> {
    if (!this.currentSession) return [];

    const recommendations: string[] = [];
    const charterType = this.currentSession.charterType;

    switch (charterType.category) {
      case CharterCategory.FISHING:
        recommendations.push(
          "Try using live bait for better results",
          "Check the tide charts for optimal fishing times",
          "Consider moving to deeper waters for larger species"
        );
        break;

      case CharterCategory.LEISURE:
        if (charterType.subcategory === 'booze_cruises') {
          recommendations.push(
            "Time your drinks with the music playlist",
            "Stay hydrated between alcoholic beverages",
            "Great photo opportunities coming up at the next landmark"
          );
        } else if (charterType.subcategory === 'dolphin_tours') {
          recommendations.push(
            "Keep cameras ready for dolphin jumps",
            "Morning tours typically have more activity",
            "Look for sea birds - they often indicate dolphin presence"
          );
        }
        break;

      case CharterCategory.ADVENTURE:
        if (charterType.subcategory === 'scuba_diving') {
          recommendations.push(
            "Check your air pressure regularly",
            "Stay with your dive buddy",
            "Equalize early and often during descent"
          );
        }
        break;

      case CharterCategory.SPECIAL_EVENTS:
        recommendations.push(
          "Stick to the event timeline",
          "Coordinate with the event planner",
          "Capture key moments for the photo album"
        );
        break;
    }

    return recommendations;
  }

  /**
   * Connect to real-time services
   */
  private async connectToServices(): Promise<void> {
    try {
      // Message service
      this.messageSocket = new WebSocket('ws://localhost:8080/messages');
      this.messageSocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.emit('message_received', message);
      };

      // Location tracking
      this.locationSocket = new WebSocket('ws://localhost:8080/location');
      this.locationSocket.onmessage = (event) => {
        const location = JSON.parse(event.data);
        if (this.currentSession) {
          this.currentSession.currentLocation = location;
          this.emit('location_updated', location);
        }
      };

      // Weather alerts
      this.weatherSocket = new WebSocket('ws://localhost:8080/weather');
      this.weatherSocket.onmessage = (event) => {
        const alert = JSON.parse(event.data);
        this.emit('weather_alert', alert);
      };

    } catch (error) {
      console.error('Error connecting to services:', error);
    }
  }

  /**
   * Start tracking
   */
  private startTracking(): void {
    // Start location updates
    setInterval(() => {
      this.updateLocation();
    }, 30000); // Every 30 seconds

    // Start weather updates
    setInterval(() => {
      this.updateWeather();
    }, 300000); // Every 5 minutes
  }

  /**
   * Update location
   */
  private updateLocation(): void {
    if (this.currentSession) {
      // Mock location update
      const newLocation = {
        lat: this.currentSession.currentLocation.lat + (Math.random() - 0.5) * 0.01,
        lng: this.currentSession.currentLocation.lng + (Math.random() - 0.5) * 0.01,
        area: this.currentSession.currentLocation.area
      };
      
      this.currentSession.currentLocation = newLocation;
      this.currentSession.tripStats.distanceTraveled += 0.5;
      this.emit('location_updated', newLocation);
    }
  }

  /**
   * Update weather
   */
  private updateWeather(): void {
    if (this.currentSession) {
      // Mock weather update
      const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy'];
      const newWeather = {
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        temperature: this.currentSession.currentWeather.temperature + (Math.random() - 0.5) * 5,
        windSpeed: Math.max(0, this.currentSession.currentWeather.windSpeed + (Math.random() - 0.5) * 10),
        waveHeight: Math.max(0, this.currentSession.currentWeather.waveHeight + (Math.random() - 0.5) * 2)
      };
      
      this.currentSession.currentWeather = newWeather;
      this.emit('weather_updated', newWeather);
    }
  }

  /**
   * End companion session
   */
  public async endSession(): Promise<CompanionSession> {
    if (!this.currentSession) {
      throw new Error('No active session to end');
    }

    try {
      this.currentSession.endTime = new Date();
      this.currentSession.duration = this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
      this.currentSession.isActive = false;

      // Disconnect services
      if (this.messageSocket) {
        this.messageSocket.close();
        this.messageSocket = null;
      }
      if (this.locationSocket) {
        this.locationSocket.close();
        this.locationSocket = null;
      }
      if (this.weatherSocket) {
        this.weatherSocket.close();
        this.weatherSocket = null;
      }

      this.emit('session_ended', this.currentSession);
      const session = this.currentSession;
      this.currentSession = null;
      
      return session;

    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }

  /**
   * Get current session
   */
  public getCurrentSession(): CompanionSession | null {
    return this.currentSession;
  }

  /**
   * Destroy companion
   */
  public destroy(): void {
    this.endSession().catch(console.error);
    this.removeAllListeners();
  }
}

export default WatercraftCompanionMode;
