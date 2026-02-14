/**
 * Fishy Business Intelligence System
 * 
 * Integrates all investor pitch business logic, revenue models,
 * and competitive advantages into the platform architecture.
 * 
 * Key Features:
 * - Multi-stream revenue tracking
 * - Customer lifetime value calculations
 * - Tournament management system
 * - AI-powered recommendations
 * - Viral growth mechanisms
 */

export interface FishyBusinessMetrics {
  // Revenue Streams
  charterCommission: number;      // 15% per booking
  affiliateRevenue: number;       // Hotels, restaurants, gear
  subscriptionRevenue: number;    // Pro/Captain tiers
  premiumFeatures: number;        // Points redemption, tools
  b2bDataRevenue: number;         // Anonymized data sales
  
  // Customer Metrics
  totalRevenuePerTrip: number;    // $292 per customer
  customerLifetimeValue: number;  // $5,500-11,000
  repeatRate: number;             // 80% vs 30% industry
  crossPlatformUsage: number;     // 60% higher with unified system
  
  // Growth Metrics
  pwaInstalls: number;            // Target: 100,000 Year 1
  viralEmailVisitors: number;     // 260,000/year from email
  tournamentRevenue: number;      // $75K Year 1, $6.25M Year 5
  
  // Operational Metrics
  supportCostReduction: number;   // 70% with AI bots
  userSatisfaction: number;       // 95%+ target
  gearAffiliateRevenue: number;   // $360K Year 1
}

export interface TournamentConfig {
  id: string;
  captainId: string;
  title: string;
  description: string;
  entryFee: number;              // $20-500
  maxParticipants: number;
  startDate: string;
  endDate: string;
  location: string;
  rules: TournamentRule[];
  prizes: TournamentPrize[];
  platformFee: number;           // 10-15%
}

export interface TournamentRule {
  type: 'species' | 'weight' | 'length' | 'catch_count';
  species?: string;              // Required for species rules
  minValue?: number;             // Minimum weight/length
  maxValue?: number;             // Maximum for categories
  points: number;                // Points awarded
}

export interface TournamentPrize {
  position: number;              // 1st, 2nd, 3rd, etc.
  type: 'cash' | 'gear' | 'trip' | 'sponsor';
  value: number;
  description: string;
  sponsor?: string;              // For sponsored prizes
}

export interface FINNMemoryProfile {
  userId: string;
  
  // Memory System - 80% repeat rate driver
  anniversaries: Date[];
  birthdays: Date[];
  traditions: string[];          // Annual trips, preferences
  preferredLocations: string[];
  avoidedIssues: string[];       // Past problems to avoid
  
  // Review Intelligence
  speciesPreferences: string[];  // Favorite fish to target
  boatTypePreferences: string[]; // Center console, catamaran, etc.
  captainPreferences: string[];  // Favorite captains
  weatherTolerance: 'fair' | 'moderate' | 'rough';
  budgetRange: {
    min: number;
    max: number;
  };
  
  // Cross-Platform Concierge
  recentBookings: {
    platform: 'GCC' | 'WTV';
    type: string;
    date: string;
    satisfaction: number;
  }[];
  
  // Affiliate Automation
  gearPurchaseHistory: {
    item: string;
    price: number;
    date: string;
    category: string;
  }[];
  
  // Relationship Building
  familyMembers: {
    name: string;
    relationship: string;
    birthday?: Date;
    preferences: string[];
  }[];
  
  lastUpdated: string;
}

export interface ViralEmailConfig {
  userId: string;
  email: string;                 // @gulfcoastcharters.com
  type: 'PRO' | 'CAPTAIN' | 'PREMIUM';
  additionalEmails: number;      // Beyond included allocation
  sentCount: number;             // Weekly tracking
  clickThroughRate: number;      // Viral metric tracking
  conversionRate: number;        // Visitors to signups
}

export interface MediaStrategyConfig {
  userId: string;
  tier: 'FREE' | 'PRO';
  
  // Photo Settings (Free)
  photoUploads: number;
  photoBandwidthUsed: number;    // $0.00018 per view
  compressionLevel: number;
  
  // Video Settings (Premium)
  videoUploadsEnabled: boolean;
  videoStorageUsed: number;      // 5GB/month limit
  videoBandwidthUsed: number;    // $0.0045 per view
  maxVideoLength: number;        // 2 minutes
  maxVideoSize: number;          // 100MB
  
  // Cost Tracking
  monthlyCost: number;
  revenueGenerated: number;
}

export class FishyBusinessIntelligence {
  private static instance: FishyBusinessIntelligence;
  
  // Revenue Constants from Investor Pitch
  private readonly REVENUE_RATES = {
    CHARTER_COMMISSION: 0.15,        // 15% per booking
    HOTEL_AFFILIATE: 20,              // $20 per booking
    RESTAURANT_AFFILIATE: 6,          // $6 per booking
    CAR_RENTAL_AFFILIATE: 30,         // $30 per booking
    ACTIVITY_AFFILIATE: 15,           // $15 per booking
    GEAR_AFFILIATE: 8,                // $8 per booking
    GROCERY_AFFILIATE: 13,            // $13 per booking
    INSURANCE: 25,                    // $25 per booking
    EMAIL_FORWARDING: 0.10,           // $0.10/user/month
    EMAIL_PRICE: 19.99,               // $19.99/year per additional
    
    // Tournament Fees
    TOURNAMENT_PLATFORM_FEE: 0.12,   // 12% average
    SPONSORED_TOURNAMENT_MIN: 2000,  // $2,000 minimum
    SPONSORED_TOURNAMENT_MAX: 5000,  // $5,000 maximum
    
    // Subscription Tiers
    PRO_MONTHLY: 9.99,
    CAPTAIN_MONTHLY: 29.99,
    FEATURED_LISTING_MIN: 199,
    FEATURED_LISTING_MAX: 499,
  };

  // Growth Targets from Pitch Deck
  private readonly GROWTH_TARGETS = {
    YEAR_1: {
      activeCaptains: 1000,
      completedBookings: 10000,
      grossBookingVolume: 1000000,
      platformRevenue: 150000,
      pwaInstalls: 100000,
      tournaments: 1000,
      tripsPerMonth: 1000,
    },
    YEAR_3: {
      activeCaptains: 5000,
      completedBookings: 60000,
      grossBookingVolume: 11700000,
      platformRevenue: 17500000,
      tournaments: 10000,
      tripsPerMonth: 5000,
    },
    YEAR_5: {
      activeCaptains: 10000,
      completedBookings: 120000,
      grossBookingVolume: 30000000,
      platformRevenue: 35000000,
      tournaments: 50000,
      tripsPerMonth: 10000,
    }
  };

  public static getInstance(): FishyBusinessIntelligence {
    if (!FishyBusinessIntelligence.instance) {
      FishyBusinessIntelligence.instance = new FishyBusinessIntelligence();
    }
    return FishyBusinessIntelligence.instance;
  }

  /**
   * Calculate total revenue per customer trip
   * Based on investor pitch: $292 per customer
   */
  public calculateRevenuePerTrip(bookingValue: number): number {
    const rates = this.REVENUE_RATES;
    
    return (
      (bookingValue * rates.CHARTER_COMMISSION) +  // Charter commission
      rates.HOTEL_AFFILIATE +                        // Hotel affiliate
      rates.RESTAURANT_AFFILIATE +                   // Restaurant affiliate
      rates.CAR_RENTAL_AFFILIATE +                   // Car rental affiliate
      rates.ACTIVITY_AFFILIATE +                     // Activity affiliate
      rates.GEAR_AFFILIATE +                         // Gear affiliate
      rates.GROCERY_AFFILIATE +                      // Grocery/misc
      rates.INSURANCE                                // Insurance
    );
  }

  /**
   * Calculate customer lifetime value
   * Based on 10-15 trips at $292 each
   */
  public calculateCustomerLifetimeValue(tripsPerCustomer: number = 12): number {
    const revenuePerTrip = this.calculateRevenuePerTrip(500); // Average $500 charter
    return revenuePerTrip * tripsPerCustomer;
  }

  /**
   * Project revenue based on growth targets
   */
  public projectRevenue(year: 1 | 3 | 5): {
    grossBookingVolume: number;
    platformRevenue: number;
    tripsPerMonth: number;
    tournamentRevenue: number;
    affiliateRevenue: number;
  } {
    const targets = this.GROWTH_TARGETS[`YEAR_${year}`];
    
    // Calculate tournament revenue
    const avgTournamentFee = 75; // Year 1 average, scales up
    const tournamentRevenue = targets.tournaments * avgTournamentFee * this.REVENUE_RATES.TOURNAMENT_PLATFORM_FEE;
    
    // Calculate affiliate revenue (40% of customers buy gear)
    const gearAffiliateRevenue = targets.completedBookings * 0.4 * this.REVENUE_RATES.GEAR_AFFILIATE;
    
    return {
      grossBookingVolume: targets.grossBookingVolume,
      platformRevenue: targets.platformRevenue,
      tripsPerMonth: targets.tripsPerMonth,
      tournamentRevenue,
      affiliateRevenue: gearAffiliateRevenue,
    };
  }

  /**
   * Calculate viral email impact
   * Based on: 1,000 captains × 50 emails/week = 50,000 emails/week
   */
  public calculateViralEmailImpact(captainCount: number): {
    emailsPerWeek: number;
    visitorsPerWeek: number;
    visitorsPerYear: number;
    annualRevenue: number;
  } {
    const emailsPerWeek = captainCount * 50;
    const clickThroughRate = 0.10; // 10% click rate
    const visitorsPerWeek = emailsPerWeek * clickThroughRate;
    const visitorsPerYear = visitorsPerWeek * 52;
    
    // Revenue from additional email accounts
    const additionalEmailsPerUser = 1.5; // Average additional emails
    const annualRevenue = captainCount * additionalEmailsPerUser * this.REVENUE_RATES.EMAIL_PRICE;
    
    return {
      emailsPerWeek,
      visitorsPerWeek,
      visitorsPerYear,
      annualRevenue,
    };
  }

  /**
   * Calculate media strategy costs
   * Photos free, videos premium
   */
  public calculateMediaCosts(
    freeUsers: number,
    proUsers: number,
    avgPhotoViewsPerUser: number,
    avgVideoViewsPerUser: number
  ): {
    photoCosts: number;
    videoCosts: number;
    totalCosts: number;
    revenueFromPro: number;
    netProfit: number;
  } {
    const photoBandwidthCost = 0.00018; // per view
    const videoBandwidthCost = 0.0045; // per view (25x more expensive)
    
    const photoCosts = freeUsers * avgPhotoViewsPerUser * photoBandwidthCost * 12; // Monthly
    const videoCosts = proUsers * avgVideoViewsPerUser * videoBandwidthCost * 12; // Monthly
    
    const totalCosts = (photoCosts + videoCosts) * 12; // Annual
    const revenueFromPro = proUsers * this.REVENUE_RATES.PRO_MONTHLY * 12; // Annual
    const netProfit = revenueFromPro - totalCosts;
    
    return {
      photoCosts: photoCosts * 12,
      videoCosts: videoCosts * 12,
      totalCosts,
      revenueFromPro,
      netProfit,
    };
  }

  /**
   * Create FINN AI memory profile
   * Drives 80% repeat rate vs 30% industry
   */
  public createFINNProfile(userId: string): FINNMemoryProfile {
    return {
      userId,
      anniversaries: [],
      birthdays: [],
      traditions: [],
      preferredLocations: [],
      avoidedIssues: [],
      speciesPreferences: [],
      boatTypePreferences: [],
      captainPreferences: [],
      weatherTolerance: 'moderate',
      budgetRange: { min: 200, max: 1000 },
      recentBookings: [],
      gearPurchaseHistory: [],
      familyMembers: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Update FINN profile with learning data
   */
  public updateFINNProfile(
    profile: FINNMemoryProfile,
    interaction: {
      type: 'booking' | 'review' | 'purchase' | 'complaint' | 'preference';
      data: any;
    }
  ): FINNMemoryProfile {
    switch (interaction.type) {
      case 'booking':
        profile.recentBookings.push(interaction.data);
        break;
      case 'review':
        // Learn preferences from reviews
        if (interaction.data.positive) {
          profile.speciesPreferences.push(interaction.data.species);
          profile.captainPreferences.push(interaction.data.captainId);
        } else {
          profile.avoidedIssues.push(interaction.data.issue);
        }
        break;
      case 'purchase':
        profile.gearPurchaseHistory.push(interaction.data);
        break;
      case 'preference':
        if (interaction.data.location) {
          profile.preferredLocations.push(interaction.data.location);
        }
        break;
    }
    
    profile.lastUpdated = new Date().toISOString();
    return profile;
  }

  /**
   * Generate personalized recommendations using FINN AI
   */
  public generateFINNRecommendations(profile: FINNMemoryProfile): {
    charters: any[];
    gear: any[];
    activities: any[];
    reminders: {
      type: string;
      date: Date;
      message: string;
      suggestedLocations?: string[];
      suggestedActivities?: string[];
    }[];
  } {
    // This would integrate with actual booking systems
    // For now, return structure based on business intelligence
    
    const recommendations = {
      charters: [],
      gear: [],
      activities: [],
      reminders: [] as {
        type: string;
        date: Date;
        message: string;
        suggestedLocations?: string[];
        suggestedActivities?: string[];
      }[],
    };
    
    // Generate anniversary/birthday reminders
    const today = new Date();
    profile.anniversaries.forEach(anniversary => {
      const anniversaryDate = new Date(anniversary);
      if (this.isDateApproaching(anniversaryDate, today, 30)) {
        recommendations.reminders.push({
          type: 'anniversary',
          date: anniversary,
          message: 'Plan your anniversary trip!',
          suggestedLocations: profile.preferredLocations,
        });
      }
    });
    
    profile.birthdays.forEach(birthday => {
      const birthdayDate = new Date(birthday);
      if (this.isDateApproaching(birthdayDate, today, 30)) {
        recommendations.reminders.push({
          type: 'birthday',
          date: birthday,
          message: 'Birthday fishing trip celebration!',
          suggestedActivities: ['sunset_cruise', 'dolphin_watching'],
        });
      }
    });
    
    return recommendations;
  }

  /**
   * Create tournament configuration
   */
  public createTournament(config: Partial<TournamentConfig>): TournamentConfig {
    return {
      id: crypto.randomUUID(),
      captainId: config.captainId || '',
      title: config.title || '',
      description: config.description || '',
      entryFee: config.entryFee || 50,
      maxParticipants: config.maxParticipants || 20,
      startDate: config.startDate || '',
      endDate: config.endDate || '',
      location: config.location || '',
      rules: config.rules || [],
      prizes: config.prizes || [],
      platformFee: this.REVENUE_RATES.TOURNAMENT_PLATFORM_FEE,
    };
  }

  /**
   * Calculate tournament payout structure
   */
  public calculateTournamentPayouts(
    totalEntries: number,
    entryFee: number,
    platformFee: number
  ): {
    totalPrizePool: number;
    platformRevenue: number;
    captainRevenue: number;
    prizeDistribution: { position: number; amount: number }[];
  } {
    const totalPrizePool = totalEntries * entryFee;
    const platformRevenue = totalPrizePool * platformFee;
    const captainRevenue = totalPrizePool - platformRevenue;
    
    // Standard 50-30-20 payout structure
    const prizeDistribution = [
      { position: 1, amount: captainRevenue * 0.5 },
      { position: 2, amount: captainRevenue * 0.3 },
      { position: 3, amount: captainRevenue * 0.2 },
    ];
    
    return {
      totalPrizePool,
      platformRevenue,
      captainRevenue,
      prizeDistribution,
    };
  }

  /**
   * Setup viral email configuration
   */
  public setupViralEmail(userId: string, tier: 'PRO' | 'CAPTAIN'): ViralEmailConfig {
    const includedEmails = tier === 'CAPTAIN' ? 2 : 1;
    
    return {
      userId,
      email: `${userId}@gulfcoastcharters.com`,
      type: tier,
      additionalEmails: 0,
      sentCount: 0,
      clickThroughRate: 0,
      conversionRate: 0,
    };
  }

  /**
   * Configure media strategy for user
   */
  public configureMediaStrategy(userId: string, tier: 'FREE' | 'PRO'): MediaStrategyConfig {
    return {
      userId,
      tier,
      photoUploads: tier === 'FREE' ? Infinity : 100,
      photoBandwidthUsed: 0,
      compressionLevel: 0.8,
      videoUploadsEnabled: tier === 'PRO',
      videoStorageUsed: 0,
      videoBandwidthUsed: 0,
      maxVideoLength: 120, // 2 minutes
      maxVideoSize: 100 * 1024 * 1024, // 100MB
      monthlyCost: tier === 'PRO' ? this.REVENUE_RATES.PRO_MONTHLY : 0,
      revenueGenerated: 0,
    };
  }

  /**
   * Get complete business metrics dashboard
   */
  public getBusinessMetrics(currentYear: 1 | 3 | 5): FishyBusinessMetrics {
    const projections = this.projectRevenue(currentYear);
    const viralImpact = this.calculateViralEmailImpact(this.GROWTH_TARGETS[`YEAR_${currentYear}`].activeCaptains);
    const mediaCosts = this.calculateMediaCosts(
      this.GROWTH_TARGETS[`YEAR_${currentYear}`].activeCaptains * 10, // 10x more free users
      this.GROWTH_TARGETS[`YEAR_${currentYear}`].activeCaptains * 0.3, // 30% pro users
      50, // avg photo views
      20  // avg video views
    );
    
    return {
      charterCommission: projections.platformRevenue * 0.4,
      affiliateRevenue: projections.affiliateRevenue,
      subscriptionRevenue: this.GROWTH_TARGETS[`YEAR_${currentYear}`].activeCaptains * this.REVENUE_RATES.CAPTAIN_MONTHLY * 12,
      premiumFeatures: projections.platformRevenue * 0.2,
      b2bDataRevenue: currentYear === 5 ? 500000 : currentYear === 3 ? 100000 : 50000,
      
      totalRevenuePerTrip: 292,
      customerLifetimeValue: this.calculateCustomerLifetimeValue(),
      repeatRate: 0.8,
      crossPlatformUsage: 0.6,
      
      pwaInstalls: this.GROWTH_TARGETS[`YEAR_${currentYear}`].activeCaptains * 100,
      viralEmailVisitors: viralImpact.visitorsPerYear,
      tournamentRevenue: projections.tournamentRevenue,
      
      supportCostReduction: 0.7,
      userSatisfaction: 0.95,
      gearAffiliateRevenue: 360000 * currentYear, // Scales with year
    };
  }

  private isDateApproaching(targetDate: Date, currentDate: Date, daysThreshold: number): boolean {
    const timeDiff = targetDate.getTime() - currentDate.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    return daysDiff > 0 && daysDiff <= daysThreshold;
  }
}

export default FishyBusinessIntelligence;
