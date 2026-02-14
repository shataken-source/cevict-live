/**
 * While Fishing Companion Mode
 *
 * Transforms the user experience from booking tool to fishing companion.
 * Provides real-time assistance, catch logging, and captain communication.
 *
 * Features:
 * - Digital catch log with quick tap recording
 * - Real-time captain messaging for supplies/bait requests
 * - GPS location tracking and fishing spot marking
 * - Weather updates and tide information
 * - Species identification and measurement guides
 * - Photo capture with automatic metadata
 * - Trip timer and activity tracking
 * - Emergency assistance and safety features
 */

import { EventEmitter } from 'events';

export interface Catch {
  id: string;
  charterId: string;
  userId: string;
  species: string;
  weight: number;
  length?: number;
  photo?: string;
  location: {
    lat: number;
    lng: number;
    name: string;
  };
  timestamp: Date;
  bait?: string;
  technique?: string;
  weather?: {
    condition: string;
    temperature: number;
    windSpeed: number;
    waveHeight: number;
  };
  waterConditions?: {
    temperature: number;
    clarity: string;
    depth: number;
  };
  released: boolean;
  notes?: string;
  verified: boolean;
}

export interface CompanionSession {
  id: string;
  charterId: string;
  userId: string;
  captainId: string;
  startTime: Date;
  endTime?: Date;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  status: 'pre_departure' | 'active' | 'break' | 'returning' | 'completed';
  catches: Catch[];
  messages: CompanionMessage[];
  weatherAlerts: WeatherAlert[];
  emergencyContacts: EmergencyContact[];
  gearChecklist: GearItem[];
  tripStats: TripStats;
}

export interface CompanionMessage {
  id: string;
  senderId: string;
  senderType: 'client' | 'captain';
  content: string;
  type: 'text' | 'supply_request' | 'emergency' | 'location_share';
  timestamp: Date;
  read: boolean;
  metadata?: {
    requestType?: 'ice' | 'bait' | 'fuel' | 'restroom' | 'medical';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
}

export interface WeatherAlert {
  id: string;
  type: 'storm' | 'wind' | 'lightning' | 'fog' | 'temperature';
  severity: 'watch' | 'warning' | 'advisory';
  message: string;
  startTime: Date;
  endTime?: Date;
  actions: string[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: 'coast_guard' | 'captain' | 'emergency' | 'personal';
  isPrimary: boolean;
}

export interface GearItem {
  id: string;
  name: string;
  category: 'safety' | 'fishing' | 'comfort' | 'navigation';
  checked: boolean;
  required: boolean;
  quantity?: number;
  notes?: string;
}

export interface TripStats {
  totalDistance: number; // nautical miles
  fishingTime: number; // minutes
  cruisingTime: number; // minutes
  fuelUsed: number; // gallons
  waypoints: number;
  photosTaken: number;
  messagesExchanged: number;
}

export interface FishingSpot {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  depth: number;
  structure?: string;
  speciesTargeted: string[];
  successRate: number;
  notes?: string;
  isPrivate: boolean;
}

class FishingCompanionMode extends EventEmitter {
  private currentSession: CompanionSession | null = null;
  private gpsWatcher: number | null = null;
  private weatherWatcher: number | null = null;
  private messageSocket: WebSocket | null = null;
  private offlineStorage: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeOfflineStorage();
  }

  /**
   * Start a new companion session
   */
  public async startCompanionSession(charterId: string, userId: string): Promise<CompanionSession> {
    try {
      // Get charter details
      const charter = await this.getCharterDetails(charterId);
      
      // Create session
      const session: CompanionSession = {
        id: `session-${Date.now()}`,
        charterId,
        userId,
        captainId: charter.captain_id,
        startTime: new Date(),
        status: 'pre_departure',
        catches: [],
        messages: [],
        weatherAlerts: [],
        emergencyContacts: await this.getEmergencyContacts(),
        gearChecklist: this.getDefaultGearChecklist(),
        tripStats: {
          totalDistance: 0,
          fishingTime: 0,
          cruisingTime: 0,
          fuelUsed: 0,
          waypoints: 0,
          photosTaken: 0,
          messagesExchanged: 0
        }
      };

      this.currentSession = session;
      
      // Start tracking
      this.startGPSTracking();
      this.startWeatherMonitoring();
      this.initializeMessaging();
      
      // Save session
      await this.saveSession(session);

      this.emit('session_started', session);
      return session;

    } catch (error) {
      console.error('Error starting companion session:', error);
      throw error;
    }
  }

  /**
   * Quick catch logging with minimal taps
   */
  public async logQuickCatch(
    species: string,
    weight: number,
    photo?: string
  ): Promise<Catch> {
    if (!this.currentSession) {
      throw new Error('No active companion session');
    }

    try {
      const catch_: Catch = {
        id: `catch-${Date.now()}`,
        charterId: this.currentSession.charterId,
        userId: this.currentSession.userId,
        species,
        weight,
        photo,
        location: await this.getCurrentLocation(),
        timestamp: new Date(),
        released: false,
        verified: false
      };

      // Add to session
      this.currentSession.catches.push(catch_);
      this.currentSession.tripStats.photosTaken += photo ? 1 : 0;

      // Save catch
      await this.saveCatch(catch_);

      // Update leaderboard if applicable
      await this.updateLeaderboardEntry(catch_);

      // Notify captain
      await this.sendCaptainNotification('catch_logged', {
        species,
        weight,
        location: catch_.location.name
      });

      this.emit('catch_logged', catch_);
      return catch_;

    } catch (error) {
      console.error('Error logging catch:', error);
      throw error;
    }
  }

  /**
   * Send message to captain with supply requests
   */
  public async sendMessageToCaptain(
    content: string,
    type: 'text' | 'supply_request' = 'text',
    requestType?: 'ice' | 'bait' | 'fuel' | 'restroom' | 'medical'
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
        metadata: requestType ? { requestType, priority: 'medium' as const } : undefined
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

      // Save message
      await this.saveMessage(message);

      // Auto-respond for common requests
      if (type === 'supply_request') {
        await this.handleSupplyRequest(requestType);
      }

      this.emit('message_sent', message);

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Handle automatic supply request responses
   */
  private async handleSupplyRequest(requestType?: string): Promise<void> {
    if (!requestType) return;

    const validTypes = ['ice', 'bait', 'fuel', 'restroom', 'medical'];
    if (!validTypes.includes(requestType)) return;

    const responses: Record<string, string> = {
      'ice': "Captain: Coming with fresh ice right away! 🧊",
      'bait': "Captain: Checking the bait supply, what species are we targeting?",
      'fuel': "Captain: Fuel levels are good, we have plenty for the trip ⛽",
      'restroom': "Captain: We can make a quick stop at the nearest marina",
      'medical': "Captain: I have a full first aid kit, what do you need?"
    };

    const response = responses[requestType];
    if (response) {
      setTimeout(() => {
        this.simulateCaptainMessage(response);
      }, 2000);
    }
  }

  /**
   * Simulate captain message (for demo/testing)
   */
  private simulateCaptainMessage(content: string): void {
    if (!this.currentSession) return;

    const message: CompanionMessage = {
      id: `captain-msg-${Date.now()}`,
      senderId: this.currentSession.captainId,
      senderType: 'captain',
      content,
      type: 'text',
      timestamp: new Date(),
      read: false
    };

    this.currentSession.messages.push(message);
    this.emit('message_received', message);
  }

  /**
   * Get current GPS location
   */
  private async getCurrentLocation(): Promise<{ lat: number; lng: number; name: string }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({
            lat: latitude,
            lng: longitude,
            name: 'Current Location'
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Start GPS tracking
   */
  private startGPSTracking(): void {
    if (!navigator.geolocation) return;

    this.gpsWatcher = navigator.geolocation.watchPosition(
      (position) => {
        if (this.currentSession) {
          this.currentSession.currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.emit('location_updated', this.currentSession.currentLocation);
        }
      },
      (error) => {
        console.error('GPS tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  /**
   * Start weather monitoring
   */
  private startWeatherMonitoring(): void {
    // Check weather every 15 minutes
    this.weatherWatcher = window.setInterval(async () => {
      try {
        const weather = await this.getCurrentWeather();
        if (weather.hasAlerts) {
          this.emit('weather_alert', weather.alerts);
        }
      } catch (error) {
        console.error('Weather monitoring error:', error);
      }
    }, 15 * 60 * 1000);
  }

  /**
   * Initialize real-time messaging
   */
  private initializeMessaging(): void {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_COMPANION_WS_URL || 'ws://localhost:8080/companion';
      this.messageSocket = new WebSocket(wsUrl);

      this.messageSocket.onopen = () => {
        console.log('Companion messaging connected');
        this.emit('messaging_connected');
      };

      this.messageSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.messageSocket.onclose = () => {
        console.log('Companion messaging disconnected');
        this.emit('messaging_disconnected');
      };

    } catch (error) {
      console.error('Failed to initialize messaging:', error);
    }
  }

  /**
   * Handle incoming messages
   */
  private handleIncomingMessage(data: any): void {
    if (!this.currentSession) return;

    const message: CompanionMessage = {
      id: data.id,
      senderId: data.senderId,
      senderType: data.senderType,
      content: data.content,
      type: data.type,
      timestamp: new Date(data.timestamp),
      read: false,
      metadata: data.metadata
    };

    this.currentSession.messages.push(message);
    this.emit('message_received', message);
  }

  /**
   * End companion session
   */
  public async endSession(): Promise<void> {
    if (!this.currentSession) return;

    try {
      // Update session
      this.currentSession.endTime = new Date();
      this.currentSession.status = 'completed';

      // Stop tracking
      if (this.gpsWatcher) {
        navigator.geolocation.clearWatch(this.gpsWatcher);
        this.gpsWatcher = null;
      }

      if (this.weatherWatcher) {
        clearInterval(this.weatherWatcher);
        this.weatherWatcher = null;
      }

      if (this.messageSocket) {
        this.messageSocket.close();
        this.messageSocket = null;
      }

      // Save final session
      await this.saveSession(this.currentSession);

      // Generate trip summary
      const summary = await this.generateTripSummary();
      
      this.emit('session_ended', { session: this.currentSession, summary });
      this.currentSession = null;

    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }

  /**
   * Generate trip summary
   */
  private async generateTripSummary(): Promise<any> {
    if (!this.currentSession) return null;

    const duration = this.currentSession.endTime!.getTime() - this.currentSession.startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));

    return {
      duration: hours,
      catchesCaught: this.currentSession.catches.length,
      totalWeight: this.currentSession.catches.reduce((sum, c) => sum + c.weight, 0),
      speciesCaught: [...new Set(this.currentSession.catches.map(c => c.species))],
      photosTaken: this.currentSession.tripStats.photosTaken,
      messagesExchanged: this.currentSession.tripStats.messagesExchanged,
      distanceTraveled: this.currentSession.tripStats.totalDistance
    };
  }

  /**
   * Get default gear checklist
   */
  private getDefaultGearChecklist(): GearItem[] {
    return [
      { id: '1', name: 'Life Jacket', category: 'safety', checked: false, required: true },
      { id: '2', name: 'First Aid Kit', category: 'safety', checked: false, required: true },
      { id: '3', name: 'Fishing License', category: 'safety', checked: false, required: true },
      { id: '4', name: 'Sunscreen', category: 'comfort', checked: false, required: false },
      { id: '5', name: 'Hat', category: 'comfort', checked: false, required: false },
      { id: '6', name: 'Sunglasses', category: 'comfort', checked: false, required: false },
      { id: '7', name: 'Camera', category: 'fishing', checked: false, required: false },
      { id: '8', name: 'Cooler', category: 'comfort', checked: false, required: false }
    ];
  }

  /**
   * Initialize offline storage
   */
  private initializeOfflineStorage(): void {
    try {
      // Check if localStorage is available
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('fishing_companion_offline');
        if (stored) {
          const data = JSON.parse(stored);
          this.offlineStorage = new Map(Object.entries(data));
        }
      }
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  /**
   * Save data to offline storage
   */
  private saveToOfflineStorage(key: string, data: any): void {
    try {
      if (typeof localStorage !== 'undefined') {
        this.offlineStorage.set(key, data);
        localStorage.setItem('fishing_companion_offline', JSON.stringify(Object.fromEntries(this.offlineStorage)));
      }
    } catch (error) {
      console.error('Failed to save to offline storage:', error);
    }
  }

  // Database interaction methods (to be implemented with actual API calls)
  private async getCharterDetails(charterId: string): Promise<any> {
    // Mock implementation
    return { captain_id: 'captain-123' };
  }

  private async getEmergencyContacts(): Promise<EmergencyContact[]> {
    return [
      { id: '1', name: 'US Coast Guard', phone: '1-800-424-8802', type: 'coast_guard', isPrimary: true },
      { id: '2', name: 'Captain', phone: '555-0123', type: 'captain', isPrimary: false },
      { id: '3', name: 'Emergency', phone: '911', type: 'emergency', isPrimary: false }
    ];
  }

  private async saveSession(session: CompanionSession): Promise<void> {
    this.saveToOfflineStorage(`session-${session.id}`, session);
  }

  private async saveCatch(catch_: Catch): Promise<void> {
    this.saveToOfflineStorage(`catch-${catch_.id}`, catch_);
  }

  private async saveMessage(message: CompanionMessage): Promise<void> {
    this.saveToOfflineStorage(`message-${message.id}`, message);
  }

  private async updateLeaderboardEntry(catch_: Catch): Promise<void> {
    // Integration with leaderboard system
    console.log('Updating leaderboard with catch:', catch_);
  }

  private async sendCaptainNotification(type: string, data: any): Promise<void> {
    // Send notification to captain
    console.log('Captain notification:', type, data);
  }

  private async getCurrentWeather(): Promise<any> {
    // Mock weather data
    return {
      condition: 'Partly Cloudy',
      temperature: 75,
      windSpeed: 10,
      hasAlerts: false,
      alerts: []
    };
  }
}

// Singleton instance
export const fishingCompanionMode = new FishingCompanionMode();

export default FishingCompanionMode;
