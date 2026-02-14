/**
 * Interactive Trip Builder for WhereToVacation.com
 *
 * Transforms static itineraries into dynamic, draggable trip planning.
 * Integrates with GCC charters and provides crowd-sourced insights.
 *
 * Features:
 * - Drag-and-drop trip planning with calendar view
 * - Integration with unified favorites system
 * - Crowd meter integration for live capacity data
 * - GCC charter integration for fishing trips
 * - Weather and tide integration
 * - Budget tracking and cost optimization
 * - Sharing and collaboration features
 * - Mobile-responsive design
 */

import { EventEmitter } from 'events';

export interface TripPlan {
  id: string;
  userId: string;
  name: string;
  description: string;
  
  // Timing
  startDate: Date;
  endDate: Date;
  timezone: string;
  
  // Budget
  totalBudget: number;
  estimatedCost: number;
  currency: string;
  
  // Destinations
  destinations: TripDestination[];
  
  // Activities
  activities: TripActivity[];
  
  // Accommodations
  accommodations: TripAccommodation[];
  
  // Transportation
  transportation: TripTransportation[];
  
  // GCC Integration
  gccCharters: GCCCharterBooking[];
  
  // Collaboration
  collaborators: TripCollaborator[];
  isPublic: boolean;
  shareToken?: string;
  
  // Metadata
  tags: string[];
  notes: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastAccessed: Date;
}

export interface TripDestination {
  id: string;
  placeId: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  
  // Timing
  arrivalDate: Date;
  departureDate: Date;
  duration: number; // days
  
  // Crowd Data
  crowdLevel?: {
    current: number;
    predicted: number;
    lastUpdated: Date;
  };
  
  // Weather Integration
  weatherForecast?: {
    condition: string;
    temperature: number;
    precipitation: number;
    windSpeed: number;
  };
  
  // Media
  photos: string[];
  
  // Notes
  notes: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TripActivity {
  id: string;
  destinationId: string;
  name: string;
  description: string;
  category: 'dining' | 'attraction' | 'beach' | 'shopping' | 'entertainment' | 'outdoor' | 'fishing';
  
  // Timing
  scheduledDate: Date;
  duration: number; // hours
  startTime?: string;
  
  // Cost
  cost: number;
  isPaid: boolean;
  
  // Booking
  bookingRequired: boolean;
  bookingReference?: string;
  bookingUrl?: string;
  
  // Crowd Data
  crowdLevel?: {
    current: number;
    predicted: number;
  };
  
  // Location
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  
  // Media
  photos: string[];
  
  // Reviews
  rating: number;
  reviewCount: number;
  
  // Notes
  notes: string;
}

export interface TripAccommodation {
  id: string;
  name: string;
  type: 'hotel' | 'vacation_rental' | 'resort' | 'campground';
  
  // Location
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  
  // Booking
  checkInDate: Date;
  checkOutDate: Date;
  nights: number;
  
  // Cost
  costPerNight: number;
  totalCost: number;
  isPaid: boolean;
  bookingReference?: string;
  
  // Details
  rating: number;
  amenities: string[];
  capacity: number;
  rooms: number;
  
  // Media
  photos: string[];
  
  // Notes
  notes: string;
}

export interface TripTransportation {
  id: string;
  type: 'flight' | 'car_rental' | 'boat' | 'shuttle' | 'rideshare';
  
  // Route
  from: string;
  to: string;
  departureDate: Date;
  arrivalDate: Date;
  
  // Cost
  cost: number;
  isPaid: boolean;
  
  // Details
  provider: string;
  confirmationNumber?: string;
  capacity: number;
  
  // Notes
  notes: string;
}

export interface GCCCharterBooking {
  id: string;
  charterId: string;
  captainId: string;
  captainName: string;
  boatName: string;
  
  // Timing
  date: Date;
  duration: number; // hours
  startTime: string;
  
  // Cost
  cost: number;
  isPaid: boolean;
  
  // Details
  fishingType: string;
  targetSpecies: string[];
  maxGuests: number;
  currentGuests: number;
  
  // Location
  departureLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  
  // Booking
  bookingReference?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  
  // Notes
  notes: string;
}

export interface TripCollaborator {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string;
  role: 'owner' | 'editor' | 'viewer';
  invitedAt: Date;
  joinedAt?: Date;
  permissions: string[];
}

export interface TripBuilderConfig {
  enableGCCIntegration: boolean;
  enableCrowdMeters: boolean;
  enableWeatherIntegration: boolean;
  enableCollaboration: boolean;
  defaultBudget: number;
  defaultCurrency: string;
  maxDestinations: number;
  maxActivities: number;
}

class InteractiveTripBuilder extends EventEmitter {
  private currentTrip: TripPlan | null = null;
  private config: TripBuilderConfig;
  private favorites: Map<string, any> = new Map();
  private weatherData: Map<string, any> = new Map();
  private crowdData: Map<string, any> = new Map();

  constructor(config: Partial<TripBuilderConfig> = {}) {
    super();
    
    this.config = {
      enableGCCIntegration: true,
      enableCrowdMeters: true,
      enableWeatherIntegration: true,
      enableCollaboration: true,
      defaultBudget: 2000,
      defaultCurrency: 'USD',
      maxDestinations: 10,
      maxActivities: 50,
      ...config
    };

    this.initializeData();
  }

  /**
   * Initialize trip builder with user data
   */
  private async initializeData(): Promise<void> {
    try {
      // Load user favorites
      await this.loadUserFavorites();
      
      // Load weather data if enabled
      if (this.config.enableWeatherIntegration) {
        await this.loadWeatherData();
      }
      
      // Load crowd data if enabled
      if (this.config.enableCrowdMeters) {
        await this.loadCrowdData();
      }
      
    } catch (error) {
      console.error('Error initializing trip builder:', error);
    }
  }

  /**
   * Create new trip plan
   */
  public async createTripPlan(tripData: {
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    totalBudget?: number;
  }): Promise<TripPlan> {
    try {
      const trip: TripPlan = {
        id: `trip-${Date.now()}`,
        userId: 'current-user-id', // Would come from auth context
        name: tripData.name,
        description: tripData.description,
        startDate: tripData.startDate,
        endDate: tripData.endDate,
        timezone: 'America/Chicago',
        totalBudget: tripData.totalBudget || this.config.defaultBudget,
        estimatedCost: 0,
        currency: this.config.defaultCurrency,
        destinations: [],
        activities: [],
        accommodations: [],
        transportation: [],
        gccCharters: [],
        collaborators: [],
        isPublic: false,
        tags: [],
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessed: new Date()
      };

      this.currentTrip = trip;
      
      // Save to database
      await this.saveTripPlan(trip);
      
      this.emit('trip_created', trip);
      return trip;

    } catch (error) {
      console.error('Error creating trip plan:', error);
      throw error;
    }
  }

  /**
   * Add destination to trip
   */
  public async addDestination(destinationData: {
    placeId: string;
    name: string;
    address: string;
    location: { lat: number; lng: number };
    arrivalDate: Date;
    departureDate: Date;
  }): Promise<TripDestination> {
    if (!this.currentTrip) {
      throw new Error('No active trip plan');
    }

    if (this.currentTrip.destinations.length >= this.config.maxDestinations) {
      throw new Error('Maximum destinations reached');
    }

    try {
      const destination: TripDestination = {
        id: `dest-${Date.now()}`,
        placeId: destinationData.placeId,
        name: destinationData.name,
        address: destinationData.address,
        location: destinationData.location,
        arrivalDate: destinationData.arrivalDate,
        departureDate: destinationData.departureDate,
        duration: Math.ceil((destinationData.departureDate.getTime() - destinationData.arrivalDate.getTime()) / (1000 * 60 * 60 * 24)),
        photos: [],
        notes: '',
        priority: 'medium'
      };

      // Get crowd data if enabled
      if (this.config.enableCrowdMeters) {
        destination.crowdLevel = await this.getCrowdData(destinationData.placeId);
      }

      // Get weather forecast if enabled
      if (this.config.enableWeatherIntegration) {
        destination.weatherForecast = await this.getWeatherForecast(destinationData.location);
      }

      this.currentTrip.destinations.push(destination);
      this.currentTrip.destinations.sort((a, b) => a.arrivalDate.getTime() - b.arrivalDate.getTime());

      // Update trip cost
      await this.updateTripCost();

      // Save trip
      await this.saveTripPlan(this.currentTrip);

      this.emit('destination_added', destination);
      return destination;

    } catch (error) {
      console.error('Error adding destination:', error);
      throw error;
    }
  }

  /**
   * Add activity to trip
   */
  public async addActivity(activityData: {
    destinationId: string;
    name: string;
    description: string;
    category: string;
    scheduledDate: Date;
    duration: number;
    cost?: number;
  }): Promise<TripActivity> {
    if (!this.currentTrip) {
      throw new Error('No active trip plan');
    }

    if (this.currentTrip.activities.length >= this.config.maxActivities) {
      throw new Error('Maximum activities reached');
    }

    try {
      const activity: TripActivity = {
        id: `activity-${Date.now()}`,
        destinationId: activityData.destinationId,
        name: activityData.name,
        description: activityData.description,
        category: activityData.category as any,
        scheduledDate: activityData.scheduledDate,
        duration: activityData.duration,
        cost: activityData.cost || 0,
        isPaid: false,
        bookingRequired: false,
        rating: 0,
        reviewCount: 0,
        photos: [],
        notes: ''
      };

      // Get crowd data for activity
      if (this.config.enableCrowdMeters) {
        activity.crowdLevel = await this.getCrowdData(activityData.destinationId);
      }

      this.currentTrip.activities.push(activity);
      this.currentTrip.activities.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

      // Update trip cost
      await this.updateTripCost();

      // Save trip
      await this.saveTripPlan(this.currentTrip);

      this.emit('activity_added', activity);
      return activity;

    } catch (error) {
      console.error('Error adding activity:', error);
      throw error;
    }
  }

  /**
   * Add GCC charter to trip
   */
  public async addGCCCharter(charterData: {
    charterId: string;
    captainId: string;
    captainName: string;
    boatName: string;
    date: Date;
    duration: number;
    startTime: string;
    cost: number;
  }): Promise<GCCCharterBooking> {
    if (!this.currentTrip || !this.config.enableGCCIntegration) {
      throw new Error('GCC integration not available');
    }

    try {
      const charter: GCCCharterBooking = {
        id: `charter-${Date.now()}`,
        charterId: charterData.charterId,
        captainId: charterData.captainId,
        captainName: charterData.captainName,
        boatName: charterData.boatName,
        date: charterData.date,
        duration: charterData.duration,
        startTime: charterData.startTime,
        cost: charterData.cost,
        isPaid: false,
        fishingType: 'inshore',
        targetSpecies: [],
        maxGuests: 6,
        currentGuests: 1,
        departureLocation: {
          lat: 30.2949,
          lng: -87.7435,
          address: 'Orange Beach, AL'
        },
        status: 'pending',
        notes: ''
      };

      this.currentTrip.gccCharters.push(charter);

      // Update trip cost
      await this.updateTripCost();

      // Save trip
      await this.saveTripPlan(this.currentTrip);

      this.emit('gcc_charter_added', charter);
      return charter;

    } catch (error) {
      console.error('Error adding GCC charter:', error);
      throw error;
    }
  }

  /**
   * Drag and drop reordering
   */
  public async reorderItems(type: 'destinations' | 'activities', fromIndex: number, toIndex: number): Promise<void> {
    if (!this.currentTrip) {
      throw new Error('No active trip plan');
    }

    try {
      if (type === 'destinations') {
        const items = this.currentTrip.destinations;
        const [movedItem] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, movedItem);
      } else {
        const items = this.currentTrip.activities;
        const [movedItem] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, movedItem);
      }

      // Update timing based on new order
      if (type === 'destinations') {
        await this.updateDestinationTiming();
      }

      await this.saveTripPlan(this.currentTrip);
      this.emit('items_reordered', { type, fromIndex, toIndex });

    } catch (error) {
      console.error('Error reordering items:', error);
      throw error;
    }
  }

  /**
   * Get trip suggestions based on preferences
   */
  public async getTripSuggestions(preferences: {
    interests: string[];
    budget: number;
    groupSize: number;
    duration: number;
  }): Promise<any[]> {
    try {
      // Get suggestions from favorites and popular destinations
      const suggestions = [];

      // Add favorite places
      const favoritePlaces = Array.from(this.favorites.values())
        .filter(fav => fav.type === 'place')
        .slice(0, 5);

      suggestions.push(...favoritePlaces.map(place => ({
        type: 'favorite',
        ...place,
        reason: 'Previously saved'
      })));

      // Add GCC charter suggestions if enabled
      if (this.config.enableGCCIntegration && preferences.interests.includes('fishing')) {
        const charterSuggestions = await this.getGCCCharterSuggestions(preferences);
        suggestions.push(...charterSuggestions);
      }

      // Add popular destinations
      const popularDestinations = await this.getPopularDestinations(preferences);
      suggestions.push(...popularDestinations);

      return suggestions.slice(0, 10);

    } catch (error) {
      console.error('Error getting trip suggestions:', error);
      return [];
    }
  }

  /**
   * Get GCC charter suggestions
   */
  private async getGCCCharterSuggestions(preferences: any): Promise<any[]> {
    // Mock implementation
    return [];
  }

  /**
   * Get popular destinations
   */
  private async getPopularDestinations(preferences: any): Promise<any[]> {
    // Mock implementation
    return [];
  }

  /**
   * Generate trip itinerary
   */
  public generateItinerary(): {
    trip: TripPlan;
    dailySchedule: Array<{
      date: Date;
      destinations: TripDestination[];
      activities: TripActivity[];
      accommodations: TripAccommodation[];
      transportation: TripTransportation[];
    }>;
    totalCost: number;
    budgetRemaining: number;
    recommendations: any[];
  } {
    if (!this.currentTrip) {
      throw new Error('No active trip plan');
    }

    const itinerary = {
      trip: this.currentTrip,
      dailySchedule: [] as Array<{
        date: Date;
        destinations: TripDestination[];
        activities: TripActivity[];
        accommodations: TripAccommodation[];
        transportation: TripTransportation[];
      }>,
      totalCost: this.currentTrip.estimatedCost,
      budgetRemaining: this.currentTrip.totalBudget - this.currentTrip.estimatedCost,
      recommendations: [] as any[]
    };

    // Generate daily schedule
    const startDate = new Date(this.currentTrip.startDate);
    const endDate = new Date(this.currentTrip.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const daySchedule = {
        date: currentDate,
        destinations: [] as TripDestination[],
        activities: [] as TripActivity[],
        accommodations: [] as TripAccommodation[],
        transportation: [] as TripTransportation[]
      };

      // Add destinations for this day
      this.currentTrip.destinations.forEach(dest => {
        if (this.isSameDay(dest.arrivalDate, currentDate) || 
            this.isDateInRange(currentDate, dest.arrivalDate, dest.departureDate)) {
          daySchedule.destinations.push(dest);
        }
      });

      // Add activities for this day
      this.currentTrip.activities.forEach(activity => {
        if (this.isSameDay(activity.scheduledDate, currentDate)) {
          daySchedule.activities.push(activity);
        }
      });

      itinerary.dailySchedule.push(daySchedule);
    }

    return itinerary;
  }

  /**
   * Share trip with collaborators
   */
  public async shareTrip(emails: string[], role: 'editor' | 'viewer' = 'viewer'): Promise<void> {
    if (!this.currentTrip || !this.config.enableCollaboration) {
      throw new Error('Collaboration not enabled');
    }

    try {
      for (const email of emails) {
        const collaborator: TripCollaborator = {
          id: `collab-${Date.now()}`,
          userId: '', // Would be set after user accepts invitation
          name: email,
          email,
          avatar: '',
          role,
          invitedAt: new Date(),
          permissions: role === 'editor' ? ['edit', 'comment', 'view'] : ['view']
        };

        this.currentTrip.collaborators.push(collaborator);

        // Send invitation email
        await this.sendInvitationEmail(email, this.currentTrip, role);
      }

      await this.saveTripPlan(this.currentTrip);
      this.emit('trip_shared', { emails, role });

    } catch (error) {
      console.error('Error sharing trip:', error);
      throw error;
    }
  }

  /**
   * Update trip cost calculation
   */
  private async updateTripCost(): Promise<void> {
    if (!this.currentTrip) return;

    let totalCost = 0;

    // Sum activity costs
    totalCost += this.currentTrip.activities.reduce((sum, activity) => sum + activity.cost, 0);

    // Sum accommodation costs
    totalCost += this.currentTrip.accommodations.reduce((sum, acc) => sum + acc.totalCost, 0);

    // Sum transportation costs
    totalCost += this.currentTrip.transportation.reduce((sum, trans) => sum + trans.cost, 0);

    // Sum GCC charter costs
    totalCost += this.currentTrip.gccCharters.reduce((sum, charter) => sum + charter.cost, 0);

    this.currentTrip.estimatedCost = totalCost;
  }

  /**
   * Load user favorites
   */
  private async loadUserFavorites(): Promise<void> {
    // Mock implementation - would load from database
    this.favorites.set('place-1', {
      id: 'place-1',
      name: 'Gulf State Park',
      type: 'place',
      location: { lat: 30.2949, lng: -87.7435 }
    });
  }

  /**
   * Load weather data
   */
  private async loadWeatherData(): Promise<void> {
    // Mock implementation - would integrate with weather API
  }

  /**
   * Load crowd data
   */
  private async loadCrowdData(): Promise<void> {
    // Mock implementation - would load from crowd meters API
  }

  /**
   * Get crowd data for a place
   */
  private async getCrowdData(placeId: string): Promise<any> {
    // Mock implementation
    return {
      current: Math.floor(Math.random() * 100),
      predicted: Math.floor(Math.random() * 100),
      lastUpdated: new Date()
    };
  }

  /**
   * Get weather forecast for location
   */
  private async getWeatherForecast(location: { lat: number; lng: number }): Promise<any> {
    // Mock implementation
    return {
      condition: 'Partly Cloudy',
      temperature: 75,
      precipitation: 10,
      windSpeed: 10
    };
  }

  /**
   * Update destination timing
   */
  private async updateDestinationTiming(): Promise<void> {
    // Implementation for updating timing based on order
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(email: string, trip: TripPlan, role: string): Promise<void> {
    // Implementation for sending email
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Check if date is in range
   */
  private isDateInRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  /**
   * Save trip plan to database
   */
  private async saveTripPlan(trip: TripPlan): Promise<void> {
    // Mock implementation - would save to database
    console.log('Saving trip plan:', trip.id);
  }

  /**
   * Get current trip
   */
  public getCurrentTrip(): TripPlan | null {
    return this.currentTrip;
  }

  /**
   * Load existing trip
   */
  public async loadTrip(tripId: string): Promise<TripPlan> {
    // Mock implementation - would load from database
    throw new Error('Not implemented');
  }

  /**
   * Delete trip
   */
  public async deleteTrip(tripId: string): Promise<void> {
    // Mock implementation - would delete from database
    throw new Error('Not implemented');
  }
}

export default InteractiveTripBuilder;
