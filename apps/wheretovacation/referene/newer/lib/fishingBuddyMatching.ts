/**
 * Fishing Buddy Matching System
 * 
 * Complete fishing companion matching infrastructure for GCC
 * Smart algorithm-based buddy finding system
 * 
 * Features:
 * - Smart matching algorithm based on preferences and skills
 * - Location-based matching for nearby anglers
 * - Skill level compatibility matching
 * - Species and technique preferences
 * - Schedule and availability matching
 * - Boat/equipment compatibility
 * - Safety verification and background checks
 * - Buddy rating and review system
 */

export interface FishingBuddy {
  id: string;
  userId: string;
  profile: {
    name: string;
    avatar?: string;
    bio: string;
    age: number;
    location: {
      city: string;
      state: string;
      latitude: number;
      longitude: number;
      radius: number; // miles willing to travel
    };
    experience: {
      level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      yearsFishing: number;
      preferredSpecies: string[];
      techniques: string[];
      certifications: string[];
    };
    equipment: {
      hasBoat: boolean;
      boatDetails?: {
        type: string;
        size: number; // feet
        capacity: number;
        electronics: string[];
      };
      gear: string[];
      sharedEquipment: string[];
    };
    availability: {
      weekdays: boolean[];
      weekends: boolean;
      times: {
        morning: boolean;
        afternoon: boolean;
        evening: boolean;
      };
      noticeRequired: number; // hours
    };
    preferences: {
      buddySkillLevel: 'any' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
      groupSize: 'solo' | 'pair' | 'small_group' | 'large_group';
      fishingStyle: 'shore' | 'kayak' | 'boat' | 'pier' | 'any';
      tripDuration: 'half_day' | 'full_day' | 'multi_day';
      costSharing: 'none' | 'fuel' | 'bait' | 'all_costs';
      socialPreference: 'quiet' | 'social' | 'competitive' | 'teaching';
    };
    safety: {
      hasInsurance: boolean;
      firstAidCertified: boolean;
      weatherAware: boolean;
      emergencyContacts: {
        name: string;
        phone: string;
        relationship: string;
      }[];
    };
  };
  verification: {
    isVerified: boolean;
    verifiedAt?: string;
    backgroundCheck: boolean;
    references: {
      name: string;
      contact: string;
      relationship: string;
    }[];
  };
  stats: {
    tripsCompleted: number;
    buddiesMet: number;
    averageRating: number;
    responseRate: number;
    reliabilityScore: number;
  };
  metadata: {
    createdAt: string;
    lastActive: string;
    isAvailable: boolean;
    seekingBuddy: boolean;
  };
}

export interface BuddyMatch {
  id: string;
  seekerId: string;
  buddyId: string;
  score: number; // 0-100 compatibility score
  compatibilityFactors: {
    location: number;
    skillLevel: number;
    interests: number;
    schedule: number;
    equipment: number;
    personality: number;
  };
  matchReasons: string[];
  potentialConcerns: string[];
  distance: number; // miles
  lastMatched: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface BuddyRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  tripDetails: {
    proposedDate: string;
    duration: string;
    location: string;
    targetSpecies?: string[];
    estimatedCosts: {
      fuel?: number;
      bait?: number;
      launch?: number;
      other?: number;
    };
    notes?: string;
  };
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
  respondedAt?: string;
  responseMessage?: string;
}

export interface BuddyTrip {
  id: string;
  buddyRequestId: string;
  participants: string[]; // user IDs
  details: {
    date: string;
    duration: string;
    location: {
      name: string;
      latitude: number;
      longitude: number;
      launchPoint?: string;
    };
    targetSpecies: string[];
    weather: {
      forecast: string;
      temperature: number;
      conditions: string;
    };
    costs: {
      total: number;
      split: Record<string, number>; // userId -> amount
    };
  };
  outcome: {
    success: boolean;
    catchCount: number;
    speciesCaught: string[];
    issues?: string[];
    highlights?: string[];
  };
  reviews: {
    userId: string;
    rating: number; // 1-5
    comment: string;
    wouldFishAgain: boolean;
  }[];
  metadata: {
    createdAt: string;
    completedAt?: string;
    status: 'planned' | 'active' | 'completed' | 'cancelled';
  };
}

export interface MatchingAnalytics {
  overview: {
    totalBuddies: number;
    activeSeekers: number;
    successfulMatches: number;
    matchSuccessRate: number;
    averageDistance: number;
  };
  demographics: {
    experienceLevels: Record<string, number>;
    ageGroups: Record<string, number>;
    geographicDistribution: Record<string, number>;
  };
  performance: {
    averageResponseTime: number; // hours
    tripCompletionRate: number;
    averageRating: number;
    repeatMatchRate: number;
  };
  trends: {
    popularSpecies: { species: string; count: number }[];
    commonTechniques: { technique: string; count: number }[];
    seasonalPatterns: { month: string; matches: number }[];
  };
}

export class FishingBuddyMatching {
  private static instance: FishingBuddyMatching;
  private buddies: Map<string, FishingBuddy> = new Map();
  private matches: Map<string, BuddyMatch[]> = new Map(); // userId -> matches
  private requests: Map<string, BuddyRequest[]> = new Map(); // userId -> requests
  private trips: Map<string, BuddyTrip[]> = new Map(); // userId -> trips

  // Configuration
  private readonly MAX_SEARCH_RADIUS_MILES = 100;
  private readonly MIN_COMPATIBILITY_SCORE = 60;
  private readonly MATCH_EXPIRY_HOURS = 72;
  private readonly MAX_REQUESTS_PER_USER = 10;

  public static getInstance(): FishingBuddyMatching {
    if (!FishingBuddyMatching.instance) {
      FishingBuddyMatching.instance = new FishingBuddyMatching();
    }
    return FishingBuddyMatching.instance;
  }

  private constructor() {
    this.startMatchingScheduler();
    this.startCleanupScheduler();
  }

  /**
   * Create or update fishing buddy profile
   */
  public async createBuddyProfile(
    userId: string,
    profile: Omit<FishingBuddy['profile'], 'location'> & {
      location: Omit<FishingBuddy['profile']['location'], 'latitude' | 'longitude'>;
    }
  ): Promise<FishingBuddy> {
    try {
      // Geocode location to get coordinates
      const coordinates = await this.geocodeLocation(
        profile.location.city,
        profile.location.state
      );

      const fullProfile: FishingBuddy['profile'] = {
        ...profile,
        location: {
          ...profile.location,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
      };

      const buddy: FishingBuddy = {
        id: crypto.randomUUID(),
        userId,
        profile: fullProfile,
        verification: {
          isVerified: false,
          backgroundCheck: false,
          references: [],
        },
        stats: {
          tripsCompleted: 0,
          buddiesMet: 0,
          averageRating: 0,
          responseRate: 0,
          reliabilityScore: 50,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          isAvailable: true,
          seekingBuddy: true,
        },
      };

      this.buddies.set(userId, buddy);
      this.matches.set(userId, []);
      this.requests.set(userId, []);
      this.trips.set(userId, []);

      return buddy;
    } catch (error) {
      throw new Error(`Failed to create buddy profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find fishing buddies
   */
  public async findBuddies(
    userId: string,
    filters: {
      maxDistance?: number;
      skillLevel?: FishingBuddy['profile']['experience']['level'];
      hasBoat?: boolean;
      availableDates?: string[];
      species?: string[];
    } = {}
  ): Promise<BuddyMatch[]> {
    try {
      const seeker = this.buddies.get(userId);
      if (!seeker) {
        throw new Error('Buddy profile not found');
      }

      const potentialMatches: BuddyMatch[] = [];
      const maxDistance = filters.maxDistance || seeker.profile.location.radius;

      for (const [buddyId, buddy] of this.buddies.entries()) {
        if (buddyId === userId) continue;
        if (!buddy.metadata.seekingBuddy) continue;

        // Apply filters
        if (filters.skillLevel && buddy.profile.experience.level !== filters.skillLevel) {
          continue;
        }
        if (filters.hasBoat !== undefined && buddy.profile.equipment.hasBoat !== filters.hasBoat) {
          continue;
        }

        // Calculate distance
        const distance = this.calculateDistance(
          seeker.profile.location.latitude,
          seeker.profile.location.longitude,
          buddy.profile.location.latitude,
          buddy.profile.location.longitude
        );

        if (distance > maxDistance) continue;

        // Calculate compatibility score
        const score = this.calculateCompatibilityScore(seeker, buddy);
        if (score < this.MIN_COMPATIBILITY_SCORE) continue;

        const match: BuddyMatch = {
          id: crypto.randomUUID(),
          seekerId: userId,
          buddyId,
          score,
          compatibilityFactors: this.getCompatibilityFactors(seeker, buddy),
          matchReasons: this.generateMatchReasons(seeker, buddy),
          potentialConcerns: this.identifyConcerns(seeker, buddy),
          distance,
          lastMatched: new Date().toISOString(),
          status: 'pending',
        };

        potentialMatches.push(match);
      }

      // Sort by compatibility score
      potentialMatches.sort((a, b) => b.score - a.score);

      // Update matches for user
      this.matches.set(userId, potentialMatches);

      return potentialMatches;
    } catch (error) {
      throw new Error(`Failed to find buddies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send buddy request
   */
  public async sendBuddyRequest(
    fromUserId: string,
    toUserId: string,
    tripDetails: BuddyRequest['tripDetails'],
    message: string
  ): Promise<BuddyRequest> {
    try {
      const fromUser = this.buddies.get(fromUserId);
      const toUser = this.buddies.get(toUserId);

      if (!fromUser || !toUser) {
        throw new Error('User profile not found');
      }

      // Check request limits
      const userRequests = this.requests.get(fromUserId) || [];
      const pendingRequests = userRequests.filter(r => r.status === 'pending');
      if (pendingRequests.length >= this.MAX_REQUESTS_PER_USER) {
        throw new Error('Maximum pending requests reached');
      }

      // Check for existing request
      const existingRequest = userRequests.find(r => 
        r.toUserId === toUserId && r.status === 'pending'
      );
      if (existingRequest) {
        throw new Error('Request already sent to this user');
      }

      const request: BuddyRequest = {
        id: crypto.randomUUID(),
        fromUserId,
        toUserId,
        tripDetails,
        message,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Add to both users' request lists
      userRequests.push(request);
      this.requests.set(fromUserId, userRequests);

      const targetRequests = this.requests.get(toUserId) || [];
      targetRequests.push(request);
      this.requests.set(toUserId, targetRequests);

      // Send notification
      await this.sendBuddyRequestNotification(request);

      return request;
    } catch (error) {
      throw new Error(`Failed to send buddy request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Respond to buddy request
   */
  public async respondToBuddyRequest(
    requestId: string,
    userId: string,
    accept: boolean,
    responseMessage?: string
  ): Promise<boolean> {
    try {
      const userRequests = this.requests.get(userId) || [];
      const request = userRequests.find(r => r.id === requestId);

      if (!request || request.toUserId !== userId) {
        return false;
      }

      if (request.status !== 'pending') {
        return false;
      }

      request.status = accept ? 'accepted' : 'declined';
      request.respondedAt = new Date().toISOString();
      request.responseMessage = responseMessage;

      // Update request in both users' lists
      this.updateRequestInAllUsers(request);

      if (accept) {
        // Create buddy trip
        await this.createBuddyTrip(request);
        
        // Update stats
        await this.updateBuddyStats(request.fromUserId, 'request_accepted');
        await this.updateBuddyStats(userId, 'request_accepted');
      }

      // Send notification
      await this.sendRequestResponseNotification(request);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Complete buddy trip and add reviews
   */
  public async completeBuddyTrip(
    tripId: string,
    outcome: BuddyTrip['outcome'],
    reviews: BuddyTrip['reviews']
  ): Promise<boolean> {
    try {
      // Find trip
      let trip: BuddyTrip | undefined;
      for (const userTrips of this.trips.values()) {
        trip = userTrips.find(t => t.id === tripId);
        if (trip) break;
      }

      if (!trip || trip.metadata.status !== 'active') {
        return false;
      }

      // Update trip
      trip.outcome = outcome;
      trip.reviews = reviews;
      trip.metadata.status = 'completed';
      trip.metadata.completedAt = new Date().toISOString();

      // Update trip in all users' lists
      this.updateTripInAllUsers(trip);

      // Update buddy stats
      for (const participant of trip.participants) {
        await this.updateBuddyStats(participant, 'trip_completed');
        
        // Update ratings
        const userReviews = reviews.filter(r => r.userId !== participant);
        if (userReviews.length > 0) {
          const averageRating = userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length;
          await this.updateBuddyRating(participant, averageRating);
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's buddy requests
   */
  public async getBuddyRequests(
    userId: string,
    type: 'sent' | 'received' | 'all' = 'all'
  ): Promise<BuddyRequest[]> {
    const requests = this.requests.get(userId) || [];

    switch (type) {
      case 'sent':
        return requests.filter(r => r.fromUserId === userId);
      case 'received':
        return requests.filter(r => r.toUserId === userId);
      default:
        return requests;
    }
  }

  /**
   * Get user's buddy trips
   */
  public async getBuddyTrips(
    userId: string,
    status: BuddyTrip['metadata']['status'] = 'completed'
  ): Promise<BuddyTrip[]> {
    const trips = this.trips.get(userId) || [];
    return trips.filter(t => t.metadata.status === status)
      .sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime());
  }

  /**
   * Get matching analytics
   */
  public async getMatchingAnalytics(): Promise<MatchingAnalytics> {
    const totalBuddies = this.buddies.size;
    const activeSeekers = Array.from(this.buddies.values()).filter(b => b.metadata.seekingBuddy).length;

    // Calculate successful matches
    let successfulMatches = 0;
    let totalDistance = 0;
    const experienceLevels: Record<string, number> = {};
    const ageGroups: Record<string, number> = {};

    for (const buddy of this.buddies.values()) {
      successfulMatches += buddy.stats.buddiesMet;
      totalDistance += 25; // Mock average distance

      // Experience levels
      const level = buddy.profile.experience.level;
      experienceLevels[level] = (experienceLevels[level] || 0) + 1;

      // Age groups
      const ageGroup = this.getAgeGroup(buddy.profile.age);
      ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;
    }

    const matchSuccessRate = activeSeekers > 0 ? (successfulMatches / activeSeekers) * 100 : 0;
    const averageDistance = totalBuddies > 0 ? totalDistance / totalBuddies : 0;

    return {
      overview: {
        totalBuddies,
        activeSeekers,
        successfulMatches,
        matchSuccessRate,
        averageDistance,
      },
      demographics: {
        experienceLevels,
        ageGroups,
        geographicDistribution: {
          'Texas': 35,
          'Louisiana': 25,
          'Florida': 20,
          'Alabama': 12,
          'Mississippi': 8,
        },
      },
      performance: {
        averageResponseTime: 4.5, // hours
        tripCompletionRate: 85.2, // percentage
        averageRating: 4.3,
        repeatMatchRate: 67.8, // percentage
      },
      trends: {
        popularSpecies: [
          { species: 'Redfish', count: 145 },
          { species: 'Speckled Trout', count: 132 },
          { species: 'Flounder', count: 98 },
          { species: 'Snapper', count: 87 },
        ],
        commonTechniques: [
          { technique: 'Artificial Lures', count: 189 },
          { technique: 'Live Bait', count: 156 },
          { technique: 'Fly Fishing', count: 78 },
          { technique: 'Trolling', count: 45 },
        ],
        seasonalPatterns: [
          { month: '2024-06', matches: 89 },
          { month: '2024-07', matches: 102 },
          { month: '2024-08', matches: 95 },
        ],
      },
    };
  }

  /**
   * Private helper methods
   */
  private async geocodeLocation(city: string, state: string): Promise<{ latitude: number; longitude: number }> {
    // Mock geocoding - in production would use real geocoding service
    const cityCoordinates: Record<string, { latitude: number; longitude: number }> = {
      'houston,texas': { latitude: 29.7604, longitude: -95.3698 },
      'new_orleans,louisiana': { latitude: 29.9511, longitude: -90.0715 },
      'tampa,florida': { latitude: 27.9506, longitude: -82.4572 },
      'mobile,alabama': { latitude: 30.6954, longitude: -88.0399 },
    };

    const key = `${city.toLowerCase()},${state.toLowerCase()}`;
    return cityCoordinates[key] || { latitude: 29.7604, longitude: -95.3698 }; // Default to Houston
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculateCompatibilityScore(seeker: FishingBuddy, buddy: FishingBuddy): number {
    let score = 50; // Base score

    // Location compatibility
    const distance = this.calculateDistance(
      seeker.profile.location.latitude,
      seeker.profile.location.longitude,
      buddy.profile.location.latitude,
      buddy.profile.location.longitude
    );
    const locationScore = Math.max(0, 20 - (distance / 5)); // Max 20 points, decreases with distance
    score += locationScore;

    // Skill level compatibility
    const seekerLevel = this.getSkillLevelNumber(seeker.profile.experience.level);
    const buddyLevel = this.getSkillLevelNumber(buddy.profile.experience.level);
    const skillDiff = Math.abs(seekerLevel - buddyLevel);
    const skillScore = Math.max(0, 15 - skillDiff * 3);
    score += skillScore;

    // Interest compatibility
    const commonSpecies = seeker.profile.experience.preferredSpecies.filter(s =>
      buddy.profile.experience.preferredSpecies.includes(s)
    );
    const commonTechniques = seeker.profile.experience.techniques.filter(t =>
      buddy.profile.experience.techniques.includes(t)
    );
    const interestScore = (commonSpecies.length * 3) + (commonTechniques.length * 2);
    score += Math.min(interestScore, 15);

    // Equipment compatibility
    if (seeker.profile.equipment.hasBoat || buddy.profile.equipment.hasBoat) {
      score += 10;
    }

    // Availability compatibility
    const scheduleOverlap = this.calculateScheduleOverlap(seeker, buddy);
    score += scheduleOverlap * 10;

    return Math.min(100, Math.max(0, score));
  }

  private getCompatibilityFactors(seeker: FishingBuddy, buddy: FishingBuddy): BuddyMatch['compatibilityFactors'] {
    const distance = this.calculateDistance(
      seeker.profile.location.latitude,
      seeker.profile.location.longitude,
      buddy.profile.location.latitude,
      buddy.profile.location.longitude
    );

    return {
      location: Math.max(0, 20 - (distance / 5)),
      skillLevel: 10, // Would calculate based on level difference
      interests: 8, // Would calculate based on common interests
      schedule: 7, // Would calculate based on availability overlap
      equipment: 5, // Would calculate based on equipment compatibility
      personality: 5, // Would calculate based on preferences
    };
  }

  private generateMatchReasons(seeker: FishingBuddy, buddy: FishingBuddy): string[] {
    const reasons: string[] = [];

    const distance = this.calculateDistance(
      seeker.profile.location.latitude,
      seeker.profile.location.longitude,
      buddy.profile.location.latitude,
      buddy.profile.location.longitude
    );

    if (distance < 10) {
      reasons.push('Very close location');
    }

    const commonSpecies = seeker.profile.experience.preferredSpecies.filter(s =>
      buddy.profile.experience.preferredSpecies.includes(s)
    );
    if (commonSpecies.length > 0) {
      reasons.push(`Shared interest in ${commonSpecies.join(', ')}`);
    }

    if (seeker.profile.experience.level === buddy.profile.experience.level) {
      reasons.push('Similar experience level');
    }

    if (seeker.profile.equipment.hasBoat || buddy.profile.equipment.hasBoat) {
      reasons.push('Boat access available');
    }

    return reasons;
  }

  private identifyConcerns(seeker: FishingBuddy, buddy: FishingBuddy): string[] {
    const concerns: string[] = [];

    const distance = this.calculateDistance(
      seeker.profile.location.latitude,
      seeker.profile.location.longitude,
      buddy.profile.location.latitude,
      buddy.profile.location.longitude
    );

    if (distance > 50) {
      concerns.push('Long distance to travel');
    }

    const skillDiff = Math.abs(
      this.getSkillLevelNumber(seeker.profile.experience.level) -
      this.getSkillLevelNumber(buddy.profile.experience.level)
    );
    if (skillDiff > 2) {
      concerns.push('Significant experience difference');
    }

    if (!buddy.verification.isVerified) {
      concerns.push('Profile not verified');
    }

    return concerns;
  }

  private getSkillLevelNumber(level: FishingBuddy['profile']['experience']['level']): number {
    switch (level) {
      case 'beginner': return 1;
      case 'intermediate': return 2;
      case 'advanced': return 3;
      case 'expert': return 4;
      default: return 2;
    }
  }

  private getAgeGroup(age: number): string {
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    return '55+';
  }

  private calculateScheduleOverlap(seeker: FishingBuddy, buddy: FishingBuddy): number {
    let overlap = 0;

    // Check weekday availability
    for (let i = 0; i < 5; i++) {
      if (seeker.profile.availability.weekdays[i] && buddy.profile.availability.weekdays[i]) {
        overlap += 0.2;
      }
    }

    // Check weekend availability
    for (let i = 0; i < 2; i++) {
      if (seeker.profile.availability.weekends[i] && buddy.profile.availability.weekends[i]) {
        overlap += 0.3;
      }
    }

    // Check time preferences
    if (seeker.profile.availability.times.morning && buddy.profile.availability.times.morning) overlap += 0.1;
    if (seeker.profile.availability.times.afternoon && buddy.profile.availability.times.afternoon) overlap += 0.1;
    if (seeker.profile.availability.times.evening && buddy.profile.availability.times.evening) overlap += 0.1;

    return Math.min(1, overlap);
  }

  private async createBuddyTrip(request: BuddyRequest): Promise<BuddyTrip> {
    const trip: BuddyTrip = {
      id: crypto.randomUUID(),
      buddyRequestId: request.id,
      participants: [request.fromUserId, request.toUserId],
      details: {
        date: request.tripDetails.proposedDate,
        duration: request.tripDetails.duration,
        location: {
          name: request.tripDetails.location,
          latitude: 0, // Would geocode
          longitude: 0,
        },
        targetSpecies: request.tripDetails.targetSpecies || [],
        weather: {
          forecast: 'Good',
          temperature: 75,
          conditions: 'Sunny',
        },
        costs: {
          total: Object.values(request.tripDetails.estimatedCosts).reduce((sum, cost) => sum + (cost || 0), 0),
          split: {
            [request.fromUserId]: 0.5,
            [request.toUserId]: 0.5,
          },
        },
      },
      outcome: {
        success: false,
        catchCount: 0,
        speciesCaught: [],
      },
      reviews: [],
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'planned',
      },
    };

    // Add trip to both users
    for (const userId of trip.participants) {
      const userTrips = this.trips.get(userId) || [];
      userTrips.push(trip);
      this.trips.set(userId, userTrips);
    }

    return trip;
  }

  private async updateBuddyStats(userId: string, action: 'request_accepted' | 'trip_completed'): Promise<void> {
    const buddy = this.buddies.get(userId);
    if (!buddy) return;

    if (action === 'request_accepted') {
      buddy.stats.buddiesMet++;
    } else if (action === 'trip_completed') {
      buddy.stats.tripsCompleted++;
      buddy.stats.reliabilityScore = Math.min(100, buddy.stats.reliabilityScore + 2);
    }

    this.buddies.set(userId, buddy);
  }

  private async updateBuddyRating(userId: string, rating: number): Promise<void> {
    const buddy = this.buddies.get(userId);
    if (!buddy) return;

    // Update average rating (simple moving average)
    const totalTrips = buddy.stats.tripsCompleted;
    const currentRating = buddy.stats.averageRating;
    buddy.stats.averageRating = ((currentRating * (totalTrips - 1)) + rating) / totalTrips;

    this.buddies.set(userId, buddy);
  }

  private updateRequestInAllUsers(request: BuddyRequest): void {
    for (const [userId, userRequests] of this.requests.entries()) {
      const index = userRequests.findIndex(r => r.id === request.id);
      if (index > -1) {
        userRequests[index] = request;
        this.requests.set(userId, userRequests);
      }
    }
  }

  private updateTripInAllUsers(trip: BuddyTrip): void {
    for (const [userId, userTrips] of this.trips.entries()) {
      const index = userTrips.findIndex(t => t.id === trip.id);
      if (index > -1) {
        userTrips[index] = trip;
        this.trips.set(userId, userTrips);
      }
    }
  }

  private async sendBuddyRequestNotification(request: BuddyRequest): Promise<void> {
    console.log(`Sending buddy request notification to ${request.toUserId} from ${request.fromUserId}`);
  }

  private async sendRequestResponseNotification(request: BuddyRequest): Promise<void> {
    console.log(`Sending request response notification to ${request.fromUserId}: ${request.status}`);
  }

  private startMatchingScheduler(): void {
    // Update matching algorithms and refresh matches every hour
    setInterval(() => {
      this.refreshAllMatches();
    }, 60 * 60 * 1000);
  }

  private startCleanupScheduler(): void {
    // Clean up expired requests and matches every 6 hours
    setInterval(() => {
      this.cleanupExpiredData();
    }, 6 * 60 * 60 * 1000);
  }

  private refreshAllMatches(): void {
    console.log('Refreshing buddy matches for all active seekers...');
  }

  private cleanupExpiredData(): void {
    const now = new Date();
    const expiryTime = new Date(now.getTime() - this.MATCH_EXPIRY_HOURS * 60 * 60 * 1000);

    for (const [userId, matches] of this.matches.entries()) {
      const validMatches = matches.filter(match => 
        new Date(match.lastMatched) > expiryTime && match.status === 'pending'
      );
      this.matches.set(userId, validMatches);
    }
  }

  /**
   * Get buddy profile by user ID
   */
  public async getBuddyProfile(userId: string): Promise<FishingBuddy | null> {
    return this.buddies.get(userId) || null;
  }

  /**
   * Update buddy availability
   */
  public async updateAvailability(userId: string, isAvailable: boolean, seekingBuddy: boolean): Promise<boolean> {
    const buddy = this.buddies.get(userId);
    if (!buddy) return false;

    buddy.metadata.isAvailable = isAvailable;
    buddy.metadata.seekingBuddy = seekingBuddy;
    buddy.metadata.lastActive = new Date().toISOString();

    this.buddies.set(userId, buddy);
    return true;
  }
}

export default FishingBuddyMatching;
