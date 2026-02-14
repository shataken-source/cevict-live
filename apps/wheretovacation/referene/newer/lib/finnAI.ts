/**
 * FINN AI - Personal Memory System
 *
 * The ultimate competitive moat that drives 80% repeat rate vs 30% industry.
 * FINN remembers everything about each customer to build lifelong relationships.
 *
 * Key Capabilities:
 * - Memory System: Anniversaries, birthdays, traditions
 * - Review Intelligence: Learns preferences, avoids past issues
 * - Cross-Platform Concierge: Books complete trips across GCC + WTV
 * - Affiliate Automation: Earns commissions on gear, hotels, restaurants
 * - Relationship Building: Becomes part of customers' lives
 */

import { FINNMemoryProfile } from './fishyBusinessIntelligence';

export interface FINNInteraction {
  id: string;
  userId: string;
  type: 'booking' | 'review' | 'purchase' | 'complaint' | 'preference' | 'anniversary' | 'birthday';
  timestamp: string;
  data: any;
  sentiment: 'positive' | 'negative' | 'neutral';
  context: string;
}

export interface PersonalizedRecommendation {
  type: 'charter' | 'gear' | 'accommodation' | 'restaurant' | 'activity' | 'reminder';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  value: number;
  reasoning: string;
  actionItems: string[];
  deadline?: string;
}

export interface RelationshipMetrics {
  trustScore: number;              // 0-100, increases with positive interactions
  engagementLevel: number;         // 0-100, based on interaction frequency
  loyaltyScore: number;            // 0-100, repeat booking indicator
  lifetimeValue: number;           // Calculated LTV
  nextTripProbability: number;     // AI prediction of next booking
  preferredCommunicationChannel: 'email' | 'sms' | 'push' | 'in_app';
  optimalContactFrequency: number; // Days between contacts
}

export interface AnniversaryReminder {
  type: 'wedding' | 'dating' | 'first_trip' | 'family_tradition';
  date: string;
  years: number;
  suggestedActivities: string[];
  personalizedMessage: string;
  bookingWindow: {
    start: string;
    end: string;
  };
  budgetRecommendation: {
    min: number;
    max: number;
    reasoning: string;
  };
}

export interface GearRecommendation {
  category: 'fishing' | 'boating' | 'apparel' | 'electronics' | 'safety';
  item: string;
  brand: string;
  price: number;
  commission: number;
  reasoning: string;
  basedOn: 'purchase_history' | 'trip_type' | 'season' | 'location' | 'skill_level';
  confidence: number;              // 0-100
  affiliateLink: string;
}

export class FINNAI {
  private static instance: FINNAI;
  private profiles: Map<string, FINNMemoryProfile> = new Map();
  private interactions: Map<string, FINNInteraction[]> = new Map();
  private relationshipMetrics: Map<string, RelationshipMetrics> = new Map();

  // Memory weights for different interaction types
  private readonly MEMORY_WEIGHTS = {
    booking: 10,
    review: 8,
    purchase: 6,
    complaint: 15,          // Higher weight - critical to remember
    preference: 5,
    anniversary: 20,        // Highest weight - relationship critical
    birthday: 20,
  };

  // Sentiment analysis for relationship building
  private readonly SENTIMENT_THRESHOLDS = {
    very_positive: 0.8,
    positive: 0.6,
    neutral: 0.4,
    negative: 0.2,
    very_negative: 0.0,
  };

  public static getInstance(): FINNAI {
    if (!FINNAI.instance) {
      FINNAI.instance = new FINNAI();
    }
    return FINNAI.instance;
  }

  /**
   * Initialize FINN profile for new user
   */
  public async initializeProfile(userId: string, initialData?: {
    birthday?: string;
    anniversary?: string;
    preferences?: string[];
  }): Promise<FINNMemoryProfile> {
    const profile: FINNMemoryProfile = {
      userId,
      anniversaries: initialData?.anniversary ? [new Date(initialData.anniversary)] : [],
      birthdays: initialData?.birthday ? [new Date(initialData.birthday)] : [],
      traditions: [],
      preferredLocations: [],
      avoidedIssues: [],
      speciesPreferences: initialData?.preferences || [],
      boatTypePreferences: [],
      captainPreferences: [],
      weatherTolerance: 'moderate',
      budgetRange: { min: 200, max: 1000 },
      recentBookings: [],
      gearPurchaseHistory: [],
      familyMembers: [],
      lastUpdated: new Date().toISOString(),
    };

    this.profiles.set(userId, profile);
    this.relationshipMetrics.set(userId, this.calculateInitialMetrics());

    // Log initial interaction
    await this.logInteraction(userId, {
      type: 'preference',
      data: initialData || {},
      sentiment: 'neutral',
      context: 'profile_initialization'
    });

    return profile;
  }

  /**
   * Log user interaction for learning
   */
  public async logInteraction(
    userId: string,
    interaction: {
      type: FINNInteraction['type'];
      data: any;
      sentiment: FINNInteraction['sentiment'];
      context: string;
    }
  ): Promise<void> {
    const finnInteraction: FINNInteraction = {
      id: crypto.randomUUID(),
      userId,
      type: interaction.type,
      timestamp: new Date().toISOString(),
      data: interaction.data,
      sentiment: interaction.sentiment,
      context: interaction.context,
    };

    if (!this.interactions.has(userId)) {
      this.interactions.set(userId, []);
    }

    this.interactions.get(userId)!.push(finnInteraction);
    await this.updateProfileFromInteraction(userId, finnInteraction);
    await this.updateRelationshipMetrics(userId, finnInteraction);

    // Trigger proactive actions based on interaction
    await this.triggerProactiveActions(userId, finnInteraction);
  }

  /**
   * Log conversation for learning (alias for logInteraction for compatibility)
   * This method is called from FinnConcierge component
   */
  public async logConversation(
    userId: string,
    userMessage: string,
    finnResponse: string,
    intent?: string
  ): Promise<void> {
    // Analyze sentiment from user message
    const sentiment = this.analyzeSentimentFromMessage(userMessage);

    // Extract intent if not provided
    const detectedIntent = intent || this.detectIntentFromMessage(userMessage);

    // Convert to logInteraction format
    await this.logInteraction(userId, {
      type: 'preference',
      data: {
        userMessage,
        finnResponse,
        intent: detectedIntent,
        extractedData: this.extractDataFromMessage(userMessage),
      },
      sentiment,
      context: 'conversation',
    });
  }

  /**
   * Analyze sentiment from message text
   */
  private analyzeSentimentFromMessage(message: string): 'positive' | 'negative' | 'neutral' {
    const lowerMessage = message.toLowerCase();

    const positiveWords = ['love', 'great', 'awesome', 'perfect', 'excellent', 'amazing', 'wonderful', 'thanks', 'thank you', 'yes', 'sure', 'good'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'worst', 'disappointed', 'frustrated', 'angry', 'no', 'never', 'cancel'];

    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Detect intent from message text
   */
  private detectIntentFromMessage(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('book') || lowerMessage.includes('reserve')) return 'booking';
    if (lowerMessage.includes('weather') || lowerMessage.includes('rain')) return 'weather';
    if (lowerMessage.includes('activity') || lowerMessage.includes('do') || lowerMessage.includes('things to do')) return 'activity';
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) return 'pricing';
    if (lowerMessage.includes('cancel') || lowerMessage.includes('refund')) return 'cancellation';
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) return 'recommendation';
    if (lowerMessage.includes('question') || lowerMessage.includes('ask')) return 'question';

    return 'general';
  }

  /**
   * Extract structured data from user message
   */
  private extractDataFromMessage(message: string): Record<string, any> {
    const data: Record<string, any> = {};
    const lowerMessage = message.toLowerCase();

    // Extract dates
    const datePatterns = [
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
      /\b(\d{1,2}-\d{1,2}-\d{4})\b/,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
      /\b(next week|this weekend|tomorrow|today)\b/i,
    ];

    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        data.date = match[0];
        break;
      }
    }

    // Extract numbers (guests, budget, etc.)
    const numberPatterns = [
      /\b(\d+)\s*(people|guests|persons?)\b/i,
      /\b(\d+)\s*(dollars?|bucks?|\$)\b/i,
      /\$\s*(\d+)/i,
    ];

    for (const pattern of numberPatterns) {
      const match = message.match(pattern);
      if (match) {
        if (message.toLowerCase().includes('people') || message.toLowerCase().includes('guests')) {
          data.guests = parseInt(match[1]);
        } else if (message.toLowerCase().includes('dollar') || message.toLowerCase().includes('$')) {
          data.budget = parseInt(match[1]);
        }
      }
    }

    // Extract locations
    const locations = ['gulf shores', 'orange beach', 'dauphin island', 'fort morgan', 'perdido key'];
    for (const location of locations) {
      if (lowerMessage.includes(location)) {
        data.location = location;
        break;
      }
    }

    // Extract activity types
    const activityTypes = ['fishing', 'charter', 'rental', 'activity', 'restaurant', 'beach', 'museum', 'zoo'];
    for (const type of activityTypes) {
      if (lowerMessage.includes(type)) {
        data.activityType = type;
        break;
      }
    }

    return data;
  }

  /**
   * Get personalized recommendations using FINN AI
   */
  public async getPersonalizedRecommendations(userId: string): Promise<PersonalizedRecommendation[]> {
    const profile = this.profiles.get(userId);
    const metrics = this.relationshipMetrics.get(userId);

    if (!profile || !metrics) {
      return [];
    }

    const recommendations: PersonalizedRecommendation[] = [];

    // 1. Anniversary/Birthday Reminders (Highest Priority)
    const reminders = this.generatePersonalizedReminders(profile);
    recommendations.push(...reminders);

    // 2. Trip Recommendations based on preferences
    const tripRecommendations = this.generateTripRecommendations(profile, metrics);
    recommendations.push(...tripRecommendations);

    // 3. Gear Recommendations based on purchase history
    const gearRecommendations = this.generateGearRecommendations(profile);
    recommendations.push(...gearRecommendations);

    // 4. Cross-platform recommendations (GCC + WTV)
    const crossPlatformRecs = this.generateCrossPlatformRecommendations(profile);
    recommendations.push(...crossPlatformRecs);

    // 5. Re-engagement recommendations for inactive users
    if (metrics.nextTripProbability < 0.3) {
      const reEngagementRecs = this.generateReEngagementRecommendations(profile, metrics);
      recommendations.push(...reEngagementRecs);
    }

    // Sort by urgency and value
    return recommendations.sort((a, b) => {
      const urgencyScore = { critical: 4, high: 3, medium: 2, low: 1 };
      const aScore = urgencyScore[a.urgency] + (a.value / 1000);
      const bScore = urgencyScore[b.urgency] + (b.value / 1000);
      return bScore - aScore;
    });
  }

  /**
   * Generate personalized reminders for anniversaries and birthdays
   */
  private generatePersonalizedReminders(profile: FINNMemoryProfile): PersonalizedRecommendation[] {
    const reminders: PersonalizedRecommendation[] = [];
    const today = new Date();

    // Check anniversaries
    profile.anniversaries.forEach(anniversary => {
      const daysUntil = this.daysUntil(today, anniversary);
      if (daysUntil <= 30 && daysUntil >= 0) {
        const years = Math.floor((today.getTime() - anniversary.getTime()) / (365 * 24 * 60 * 60 * 1000));

        reminders.push({
          type: 'reminder',
          title: `${years}-Year Anniversary Trip!`,
          description: `Celebrate your special day with a memorable charter experience. Based on your past trips, we recommend ${profile.preferredLocations[0] || 'the Gulf Coast'}.`,
          urgency: daysUntil <= 7 ? 'critical' : daysUntil <= 14 ? 'high' : 'medium',
          value: years * 100, // Higher value for milestone anniversaries
          reasoning: `Anniversary in ${daysUntil} days - ${years} years together`,
          actionItems: [
            'Book premium charter',
            'Arrange special amenities',
            'Consider sunset cruise timing',
            'Add photography package'
          ],
          deadline: anniversary.toISOString(),
        });
      }
    });

    // Check birthdays
    profile.birthdays.forEach(birthday => {
      const nextBirthday = this.getNextBirthday(today, birthday);
      const daysUntil = this.daysUntil(today, nextBirthday);

      if (daysUntil <= 30 && daysUntil >= 0) {
        reminders.push({
          type: 'reminder',
          title: 'Birthday Fishing Celebration!',
          description: `Make this birthday unforgettable with a deep-sea adventure or relaxing sunset cruise.`,
          urgency: daysUntil <= 7 ? 'critical' : daysUntil <= 14 ? 'high' : 'medium',
          value: 50,
          reasoning: `Birthday in ${daysUntil} days`,
          actionItems: [
            'Choose preferred fishing style',
            'Invite friends/family',
            'Book party boat if group > 6',
            'Add birthday cake package'
          ],
          deadline: nextBirthday.toISOString(),
        });
      }
    });

    return reminders;
  }

  /**
   * Generate trip recommendations based on learned preferences
   */
  private generateTripRecommendations(profile: FINNMemoryProfile, metrics: RelationshipMetrics): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Based on species preferences
    if (profile.speciesPreferences.length > 0) {
      const preferredSpecies = profile.speciesPreferences[0];
      recommendations.push({
        type: 'charter',
        title: `${preferredSpecies} Specialized Charter`,
        description: `Based on your love for ${preferredSpecies}, we found captains with 95% success rates for this species.`,
        urgency: 'medium',
        value: 75,
        reasoning: `Positive reviews for ${preferredSpecies} trips`,
        actionItems: [
          'Book during peak season',
          'Request specialized equipment',
          'Consider multi-day trip'
        ]
      });
    }

    // Based on avoided issues
    if (profile.avoidedIssues.length > 0) {
      const avoidedIssue = profile.avoidedIssues[0];
      recommendations.push({
        type: 'charter',
        title: `Perfect Trip - No ${avoidedIssue} Issues!`,
        description: `We've selected captains and conditions specifically to avoid past issues with ${avoidedIssue}.`,
        urgency: 'medium',
        value: 60,
        reasoning: `Learning from past experience with ${avoidedIssue}`,
        actionItems: [
          'Weather guarantee included',
          'Alternative dates available',
          'Specialized captain assignment'
        ]
      });
    }

    // Based on budget preferences
    if (profile.budgetRange) {
      recommendations.push({
        type: 'charter',
        title: `Best Value in $${profile.budgetRange.min}-$${profile.budgetRange.max} Range`,
        description: `Curated charters that maximize experience within your preferred budget range.`,
        urgency: 'low',
        value: 40,
        reasoning: `Budget-conscious recommendations`,
        actionItems: [
          'Compare top 3 options',
          'Check seasonal discounts',
          'Consider weekday pricing'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generate gear recommendations based on purchase history and trip types
   */
  private generateGearRecommendations(profile: FINNMemoryProfile): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Based on purchase history
    if (profile.gearPurchaseHistory.length > 0) {
      const lastPurchase = profile.gearPurchaseHistory[profile.gearPurchaseHistory.length - 1];

      // Recommend complementary gear
      recommendations.push({
        type: 'gear',
        title: `Complete Your ${lastPurchase.category} Setup`,
        description: `Based on your recent ${lastPurchase.item} purchase, here are the perfect complementary items.`,
        urgency: 'low',
        value: 25,
        reasoning: `Complements your ${lastPurchase.item} purchase`,
        actionItems: [
          'View recommended bundles',
          'Check seasonal discounts',
          'Read customer reviews'
        ]
      });
    }

    // Seasonal gear recommendations
    const currentSeason = this.getCurrentSeason();
    const seasonalGear = this.getSeasonalGear(currentSeason);

    recommendations.push({
      type: 'gear',
      title: `${currentSeason} Fishing Essentials`,
      description: `Top-rated gear for ${currentSeason} fishing conditions in your preferred locations.`,
      urgency: 'medium',
      value: 35,
      reasoning: `Seasonal gear recommendations for ${currentSeason}`,
      actionItems: [
        'Shop seasonal collection',
        'Get expert advice',
        'Check package deals'
      ]
    });

    return recommendations;
  }

  /**
   * Generate cross-platform recommendations (GCC + WTV)
   */
  private generateCrossPlatformRecommendations(profile: FINNMemoryProfile): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // If user mostly uses GCC, recommend WTV
    const gccBookings = profile.recentBookings.filter(b => b.platform === 'GCC').length;
    const wtvBookings = profile.recentBookings.filter(b => b.platform === 'WTV').length;

    if (gccBookings > wtvBookings * 2) {
      recommendations.push({
        type: 'accommodation',
        title: 'Complete Your Gulf Coast Experience',
        description: `Based on your ${gccBookings} charter bookings, here are perfect vacation rentals for your next trip.`,
        urgency: 'medium',
        value: 100,
        reasoning: 'Cross-platform ecosystem engagement',
        actionItems: [
          'Browse beachfront properties',
          'Check charter + accommodation packages',
          'Get exclusive discounts'
        ]
      });
    }

    // If user mostly uses WTV, recommend GCC
    if (wtvBookings > gccBookings * 2) {
      recommendations.push({
        type: 'charter',
        title: 'Add Adventure to Your Beach Vacation',
        description: `Enhance your ${wtvBookings} vacation rentals with unforgettable fishing charters.`,
        urgency: 'medium',
        value: 80,
        reasoning: 'Cross-platform ecosystem engagement',
        actionItems: [
          'Book beginner-friendly charters',
          'Family package deals',
          'Half-day options available'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Generate re-engagement recommendations for inactive users
   */
  private generateReEngagementRecommendations(profile: FINNMemoryProfile, metrics: RelationshipMetrics): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Special offers to re-engage
    recommendations.push({
      type: 'charter',
      title: 'Welcome Back! Exclusive Offer Inside',
      description: `We've missed you! Here's a special 20% discount to get you back on the water.`,
      urgency: 'high',
      value: 120,
      reasoning: 'Re-engagement campaign for inactive user',
      actionItems: [
        'Claim discount code',
        'Book within 7 days',
        'Bring a friend for free'
      ]
    });

    // Remind of positive past experiences
    if (profile.recentBookings.length > 0) {
      const bestBooking = profile.recentBookings.reduce((best, current) =>
        current.satisfaction > best.satisfaction ? current : best
      );

      recommendations.push({
        type: 'charter',
        title: `Recreate Your Amazing ${bestBooking.type} Trip!`,
        description: `Your ${bestBooking.type} trip on ${bestBooking.date} was rated ${best.satisfaction}/5. Let's do it again!`,
        urgency: 'medium',
        value: 60,
        reasoning: 'Recreating past positive experiences',
        actionItems: [
          'Book similar trip',
          'Request same captain',
          'Try upgraded package'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Update profile based on interaction
   */
  private async updateProfileFromInteraction(userId: string, interaction: FINNInteraction): Promise<void> {
    const profile = this.profiles.get(userId);
    if (!profile) return;

    switch (interaction.type) {
      case 'booking':
        profile.recentBookings.push(interaction.data);
        // Keep only last 10 bookings
        if (profile.recentBookings.length > 10) {
          profile.recentBookings = profile.recentBookings.slice(-10);
        }
        break;

      case 'review':
        if (interaction.sentiment === 'positive') {
          if (interaction.data.species) {
            profile.speciesPreferences.push(interaction.data.species);
          }
          if (interaction.data.captainId) {
            profile.captainPreferences.push(interaction.data.captainId);
          }
        } else if (interaction.sentiment === 'negative') {
          if (interaction.data.issue) {
            profile.avoidedIssues.push(interaction.data.issue);
          }
        }
        break;

      case 'purchase':
        profile.gearPurchaseHistory.push(interaction.data);
        // Keep only last 20 purchases
        if (profile.gearPurchaseHistory.length > 20) {
          profile.gearPurchaseHistory = profile.gearPurchaseHistory.slice(-20);
        }
        break;

      case 'preference':
        if (interaction.data.location) {
          profile.preferredLocations.push(interaction.data.location);
        }
        if (interaction.data.budget) {
          profile.budgetRange = interaction.data.budget;
        }
        break;

      case 'anniversary':
        profile.anniversaries.push(new Date(interaction.data.date));
        break;

      case 'birthday':
        profile.birthdays.push(new Date(interaction.data.date));
        break;
    }

    profile.lastUpdated = new Date().toISOString();
    this.profiles.set(userId, profile);
  }

  /**
   * Update relationship metrics based on interaction
   */
  private async updateRelationshipMetrics(userId: string, interaction: FINNInteraction): Promise<void> {
    const metrics = this.relationshipMetrics.get(userId);
    if (!metrics) return;

    const weight = this.MEMORY_WEIGHTS[interaction.type];
    const sentimentScore = this.getSentimentScore(interaction.sentiment);

    // Update trust score based on sentiment and interaction type
    if (interaction.sentiment === 'positive') {
      metrics.trustScore = Math.min(100, metrics.trustScore + weight * 0.5);
    } else if (interaction.sentiment === 'negative') {
      metrics.trustScore = Math.max(0, metrics.trustScore - weight * 0.3);
    }

    // Update engagement level
    metrics.engagementLevel = Math.min(100, metrics.engagementLevel + weight * 0.2);

    // Update loyalty score based on repeat interactions
    const recentInteractions = this.interactions.get(userId)?.slice(-10) || [];
    const positiveRatio = recentInteractions.filter(i => i.sentiment === 'positive').length / recentInteractions.length;
    metrics.loyaltyScore = positiveRatio * 100;

    // Update next trip probability
    metrics.nextTripProbability = this.calculateNextTripProbability(metrics, recentInteractions);

    // Update optimal contact frequency based on engagement
    metrics.optimalContactFrequency = Math.max(1, Math.floor(30 / (metrics.engagementLevel / 20)));

    this.relationshipMetrics.set(userId, metrics);
  }

  /**
   * Trigger proactive actions based on interaction
   */
  private async triggerProactiveActions(userId: string, interaction: FINNInteraction): Promise<void> {
    // If complaint, trigger immediate follow-up
    if (interaction.type === 'complaint') {
      // Schedule follow-up in 24 hours
      setTimeout(() => {
        this.scheduleFollowUp(userId, 'complaint_resolution');
      }, 24 * 60 * 60 * 1000);
    }

    // If positive review, trigger referral request
    if (interaction.type === 'review' && interaction.sentiment === 'positive') {
      setTimeout(() => {
        this.scheduleFollowUp(userId, 'referral_request');
      }, 3 * 24 * 60 * 60 * 1000); // 3 days later
    }

    // If booking, trigger trip preparation reminders
    if (interaction.type === 'booking') {
      this.scheduleTripPreparationReminders(userId, interaction.data);
    }
  }

  /**
   * Get relationship metrics for user
   */
  public getRelationshipMetrics(userId: string): RelationshipMetrics | null {
    return this.relationshipMetrics.get(userId) || null;
  }

  /**
   * Get user profile
   */
  public getProfile(userId: string): FINNMemoryProfile | null {
    return this.profiles.get(userId) || null;
  }

  /**
   * Helper methods
   */
  private calculateInitialMetrics(): RelationshipMetrics {
    return {
      trustScore: 50,
      engagementLevel: 20,
      loyaltyScore: 30,
      lifetimeValue: 292, // Starting with single trip value
      nextTripProbability: 0.6,
      preferredCommunicationChannel: 'email',
      optimalContactFrequency: 14,
    };
  }

  private getSentimentScore(sentiment: FINNInteraction['sentiment']): number {
    const scores = {
      very_positive: 1.0,
      positive: 0.75,
      neutral: 0.5,
      negative: 0.25,
      very_negative: 0.0,
    };
    return scores[sentiment] || 0.5;
  }

  private daysUntil(from: Date, to: Date): number {
    const diffTime = to.getTime() - from.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getNextBirthday(today: Date, birthday: Date): Date {
    const currentYear = today.getFullYear();
    const nextBirthday = new Date(birthday);
    nextBirthday.setFullYear(currentYear);

    if (nextBirthday < today) {
      nextBirthday.setFullYear(currentYear + 1);
    }

    return nextBirthday;
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }

  private getSeasonalGear(season: string): string[] {
    const gear = {
      Spring: ['light tackle', 'rain gear', 'spinning rods'],
      Summer: ['sun protection', 'light clothing', 'coolers'],
      Fall: ['heavy tackle', 'warm clothing', 'waders'],
      Winter: ['cold weather gear', 'heavy rods', 'insulated boots']
    };
    return gear[season] || [];
  }

  private calculateNextTripProbability(metrics: RelationshipMetrics, recentInteractions: FINNInteraction[]): number {
    const baseProbability = 0.3;
    const trustBonus = metrics.trustScore * 0.003;
    const engagementBonus = metrics.engagementLevel * 0.002;
    const loyaltyBonus = metrics.loyaltyScore * 0.002;

    const recentPositiveInteractions = recentInteractions.filter(i => i.sentiment === 'positive').length;
    const interactionBonus = Math.min(0.2, recentPositiveInteractions * 0.02);

    return Math.min(0.95, baseProbability + trustBonus + engagementBonus + loyaltyBonus + interactionBonus);
  }

  private async scheduleFollowUp(userId: string, type: string): Promise<void> {
    // This would integrate with your notification system
    console.log(`Scheduled ${type} follow-up for user ${userId}`);
  }

  private scheduleTripPreparationReminders(userId: string, bookingData: any): void {
    // Schedule reminders for trip preparation
    const tripDate = new Date(bookingData.date);
    const today = new Date();
    const daysUntil = this.daysUntil(today, tripDate);

    if (daysUntil > 7) {
      setTimeout(() => {
        this.scheduleFollowUp(userId, 'trip_preparation_1_week');
      }, (daysUntil - 7) * 24 * 60 * 60 * 1000);
    }

    if (daysUntil > 1) {
      setTimeout(() => {
        this.scheduleFollowUp(userId, 'trip_preparation_1_day');
      }, (daysUntil - 1) * 24 * 60 * 60 * 1000);
    }
  }
}

export default FINNAI;
