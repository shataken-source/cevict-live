/**
 * Local Deal Exchange for Business Flash Deals
 *
 * Creates a dedicated marketplace where local businesses can post exclusive
 * flash deals for trusted community members. Drives local commerce and
 * provides value beyond static content.
 *
 * Features:
 * - Flash deals with expiration and limited availability
 * - Trust level targeting for exclusive offers
 * - Business verification and management system
 * - Cross-site promotion (GCC & WTV)
 * - Mobile-optimized deal claiming
 * - Analytics for business performance
 * - Integration with trip planning
 * - Push notifications for hot deals
 */

import { EventEmitter } from 'eventemitter3';

export interface LocalDeal {
  id: string;
  businessId: string;
  businessName: string;
  businessType: 'restaurant' | 'shop' | 'service' | 'charter' | 'accommodation' | 'attraction';
  
  // Deal Details
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'bogo' | 'free_item' | 'upgrade';
  discountValue: number;
  originalPrice?: number;
  dealPrice?: number;
  
  // Targeting
  minTrustLevel: 'new' | 'verified' | 'veteran' | 'elite';
  requiredBadges: string[];
  maxUses?: number;
  currentUses: number;
  
  // Timing
  createdAt: Date;
  startsAt: Date;
  expiresAt: Date;
  
  // Restrictions
  validDays: string[];
  validHours: { start: string; end: string }[];
  blackoutDates: Date[];
  minimumPurchase?: number;
  maxPerCustomer: number;
  
  // Location
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  
  // Media
  images: string[];
  categories: string[];
  
  // Status
  isActive: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  
  // Cross-Site
  sites: ('gcc' | 'wtv')[];
  
  // Analytics
  views: number;
  clicks: number;
  claims: number;
  revenue: number;
  
  // Business Info
  contact: {
    phone: string;
    website: string;
    email: string;
  };
  
  // Terms
  termsAndConditions: string;
  howToRedeem: string;
}

export interface Business {
  id: string;
  name: string;
  type: string;
  description: string;
  
  // Location
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  
  // Contact
  contact: {
    phone: string;
    website: string;
    email: string;
  };
  
  // Verification
  isVerified: boolean;
  verifiedAt?: Date;
  verificationDocuments: string[];
  
  // Business Hours
  businessHours: {
    [key: string]: { open: string; close: string } | null;
  };
  
  // Social
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  
  // Stats
  totalDeals: number;
  activeDeals: number;
  totalClaims: number;
  totalRevenue: number;
  
  // Membership
  membershipTier: 'basic' | 'premium' | 'enterprise';
  membershipExpiresAt?: Date;
  
  // Created
  createdAt: Date;
  updatedAt: Date;
}

export interface DealClaim {
  id: string;
  dealId: string;
  userId: string;
  userName: string;
  userTrustLevel: string;
  
  // Claim Details
  claimedAt: Date;
  redeemedAt?: Date;
  expiresAt: Date;
  
  // Status
  status: 'claimed' | 'redeemed' | 'expired' | 'cancelled';
  
  // Verification
  verificationCode: string;
  qrCode: string;
  
  // Notes
  notes?: string;
}

export interface DealAnalytics {
  dealId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  
  // Performance Metrics
  totalViews: number;
  uniqueViews: number;
  totalClicks: number;
  totalClaims: number;
  totalRedemptions: number;
  conversionRate: number;
  revenue: number;
  
  // User Breakdown
  claimsByTrustLevel: Record<string, number>;
  viewsBySite: Record<string, number>;
  
  // Time Analysis
  viewsByHour: Array<{ hour: number; views: number }>;
  claimsByDay: Array<{ date: string; claims: number }>;
  
  // Geographic
  claimsByLocation: Array<{ city: string; claims: number }>;
}

export interface DealExchangeConfig {
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  maxActiveDealsPerBusiness: number;
  minDealDuration: number; // hours
  maxDealDuration: number; // days
  requireBusinessVerification: boolean;
  autoExpireDeals: boolean;
}

class LocalDealExchange extends EventEmitter {
  private config: DealExchangeConfig;
  private deals: Map<string, LocalDeal> = new Map();
  private businesses: Map<string, Business> = new Map();
  private claims: Map<string, DealClaim[]> = new Map();
  private userClaims: Map<string, string[]> = new Map(); // userId -> dealIds

  constructor(config: Partial<DealExchangeConfig> = {}) {
    super();
    
    this.config = {
      enablePushNotifications: true,
      enableEmailNotifications: true,
      maxActiveDealsPerBusiness: 10,
      minDealDuration: 1,
      maxDealDuration: 30,
      requireBusinessVerification: true,
      autoExpireDeals: true,
      ...config
    };

    this.initializeBusinesses();
    this.startPeriodicTasks();
  }

  /**
   * Initialize sample businesses
   */
  private initializeBusinesses(): void {
    const sampleBusinesses: Business[] = [
      {
        id: 'biz-1',
        name: 'The Gulf Coast Restaurant',
        type: 'restaurant',
        description: 'Fresh seafood with Gulf views',
        location: { lat: 30.2949, lng: -87.7435, address: '123 Gulf Shores Pkwy, Gulf Shores, AL' },
        contact: { phone: '251-555-0123', website: 'gulfcoastrestaurant.com', email: 'info@gulfcoastrestaurant.com' },
        isVerified: true,
        verifiedAt: new Date(),
        verificationDocuments: [],
        businessHours: {
          Monday: { open: '11:00', close: '22:00' },
          Tuesday: { open: '11:00', close: '22:00' },
          Wednesday: { open: '11:00', close: '22:00' },
          Thursday: { open: '11:00', close: '22:00' },
          Friday: { open: '11:00', close: '23:00' },
          Saturday: { open: '11:00', close: '23:00' },
          Sunday: { open: '11:00', close: '21:00' }
        },
        socialMedia: {
          facebook: 'gulfcoastrestaurant',
          instagram: '@gulfcoastrestaurant'
        },
        totalDeals: 5,
        activeDeals: 2,
        totalClaims: 45,
        totalRevenue: 2250,
        membershipTier: 'premium',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      },
      {
        id: 'biz-2',
        name: 'Coastal Adventures Charter',
        type: 'charter',
        description: 'Premier fishing charters in the Gulf',
        location: { lat: 30.2879, lng: -87.7585, address: '26389 Canal Rd, Orange Beach, AL' },
        contact: { phone: '251-555-0456', website: 'coastaladventures.com', email: 'book@coastaladventures.com' },
        isVerified: true,
        verifiedAt: new Date(),
        verificationDocuments: [],
        businessHours: {
          Monday: { open: '06:00', close: '18:00' },
          Tuesday: { open: '06:00', close: '18:00' },
          Wednesday: { open: '06:00', close: '18:00' },
          Thursday: { open: '06:00', close: '18:00' },
          Friday: { open: '06:00', close: '18:00' },
          Saturday: { open: '06:00', close: '18:00' },
          Sunday: { open: '06:00', close: '18:00' }
        },
        socialMedia: {
          facebook: 'coastaladventures',
          instagram: '@coastaladventures'
        },
        totalDeals: 3,
        activeDeals: 1,
        totalClaims: 28,
        totalRevenue: 5600,
        membershipTier: 'enterprise',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date()
      }
    ];

    sampleBusinesses.forEach(business => {
      this.businesses.set(business.id, business);
      this.claims.set(business.id, []);
    });
  }

  /**
   * Create new deal
   */
  public async createDeal(dealData: {
    businessId: string;
    title: string;
    description: string;
    discountType: string;
    discountValue: number;
    minTrustLevel?: 'new' | 'verified' | 'veteran' | 'elite';
    startsAt: Date;
    expiresAt: Date;
    maxUses?: number;
    sites?: string[];
  }, createdBy: string): Promise<LocalDeal> {
    try {
      const business = this.businesses.get(dealData.businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      if (this.config.requireBusinessVerification && !business.isVerified) {
        throw new Error('Business must be verified to create deals');
      }

      // Check active deal limit
      const activeDeals = Array.from(this.deals.values())
        .filter(d => d.businessId === dealData.businessId && d.isActive);
      
      if (activeDeals.length >= this.config.maxActiveDealsPerBusiness) {
        throw new Error('Maximum active deals reached for this business');
      }

      // Validate timing
      const duration = (dealData.expiresAt.getTime() - dealData.startsAt.getTime()) / (1000 * 60 * 60);
      if (duration < this.config.minDealDuration) {
        throw new Error(`Deal must run for at least ${this.config.minDealDuration} hours`);
      }
      if (duration > this.config.maxDealDuration * 24) {
        throw new Error(`Deal cannot run for more than ${this.config.maxDealDuration} days`);
      }

      const deal: LocalDeal = {
        id: `deal-${Date.now()}`,
        businessId: dealData.businessId,
        businessName: business.name,
        businessType: business.type as any,
        title: dealData.title,
        description: dealData.description,
        discountType: dealData.discountType as any,
        discountValue: dealData.discountValue,
        minTrustLevel: dealData.minTrustLevel || 'new',
        requiredBadges: [],
        maxUses: dealData.maxUses,
        currentUses: 0,
        createdAt: new Date(),
        startsAt: dealData.startsAt,
        expiresAt: dealData.expiresAt,
        validDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        validHours: [{ start: '00:00', end: '23:59' }],
        blackoutDates: [],
        maxPerCustomer: 1,
        location: business.location,
        images: [],
        categories: [],
        isActive: true,
        isFeatured: false,
        isVerified: business.isVerified,
        sites: (dealData.sites || ['gcc', 'wtv']) as ('gcc' | 'wtv')[],
        views: 0,
        clicks: 0,
        claims: 0,
        revenue: 0,
        contact: business.contact,
        termsAndConditions: 'Standard terms apply',
        howToRedeem: 'Show this deal at checkout'
      };

      this.deals.set(deal.id, deal);

      // Update business stats
      business.totalDeals++;
      business.activeDeals++;
      business.updatedAt = new Date();

      this.emit('deal_created', deal);
      return deal;

    } catch (error) {
      console.error('Error creating deal:', error);
      throw error;
    }
  }

  /**
   * Get available deals for user
   */
  public async getAvailableDeals(user: {
    id: string;
    trustLevel: string;
    badges: string[];
    site: 'gcc' | 'wtv';
  }, options: {
    businessType?: string;
    category?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<LocalDeal[]> {
    try {
      const now = new Date();
      let deals = Array.from(this.deals.values());

      // Filter active deals
      deals = deals.filter(deal => 
        deal.isActive &&
        deal.isVerified &&
        deal.sites.includes(user.site) &&
        deal.startsAt <= now &&
        deal.expiresAt > now
      );

      // Filter by user trust level
      deals = deals.filter(deal => 
        this.checkTrustLevel(user.trustLevel, deal.minTrustLevel)
      );

      // Filter by required badges
      deals = deals.filter(deal => 
        deal.requiredBadges.length === 0 || 
        deal.requiredBadges.some(badge => user.badges.includes(badge))
      );

      // Filter by availability
      deals = deals.filter(deal => 
        !deal.maxUses || deal.currentUses < deal.maxUses
      );

      // Apply additional filters
      if (options.businessType) {
        deals = deals.filter(deal => deal.businessType === options.businessType);
      }

      if (options.featured) {
        deals = deals.filter(deal => deal.isFeatured);
      }

      // Sort by relevance (featured first, then by creation date)
      deals.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      // Apply pagination
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      deals = deals.slice(offset, offset + limit);

      return deals;

    } catch (error) {
      console.error('Error getting available deals:', error);
      return [];
    }
  }

  /**
   * Claim a deal
   */
  public async claimDeal(dealId: string, user: {
    id: string;
    name: string;
    trustLevel: string;
  }): Promise<DealClaim> {
    try {
      const deal = this.deals.get(dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      // Validate deal is still available
      if (!deal.isActive || deal.expiresAt <= new Date()) {
        throw new Error('Deal is no longer available');
      }

      // Check user eligibility
      if (!this.checkTrustLevel(user.trustLevel, deal.minTrustLevel)) {
        throw new Error('Insufficient trust level for this deal');
      }

      // Check if user has already claimed this deal
      const userDealIds = this.userClaims.get(user.id) || [];
      if (userDealIds.includes(dealId)) {
        throw new Error('You have already claimed this deal');
      }

      // Check availability
      if (deal.maxUses && deal.currentUses >= deal.maxUses) {
        throw new Error('Deal has reached maximum uses');
      }

      // Create claim
      const claim: DealClaim = {
        id: `claim-${Date.now()}`,
        dealId,
        userId: user.id,
        userName: user.name,
        userTrustLevel: user.trustLevel,
        claimedAt: new Date(),
        expiresAt: deal.expiresAt,
        status: 'claimed',
        verificationCode: this.generateVerificationCode(),
        qrCode: this.generateQRCode(dealId, user.id)
      };

      // Store claim
      const businessClaims = this.claims.get(deal.businessId) || [];
      businessClaims.push(claim);
      this.claims.set(deal.businessId, businessClaims);

      // Update user claims
      userDealIds.push(dealId);
      this.userClaims.set(user.id, userDealIds);

      // Update deal stats
      deal.currentUses++;
      deal.claims++;
      
      // Calculate revenue
      if (deal.dealPrice) {
        deal.revenue += deal.dealPrice;
      }

      // Update business stats
      const business = this.businesses.get(deal.businessId);
      if (business) {
        business.totalClaims++;
        if (deal.dealPrice) {
          business.totalRevenue += deal.dealPrice;
        }
        business.updatedAt = new Date();
      }

      this.emit('deal_claimed', claim);
      return claim;

    } catch (error) {
      console.error('Error claiming deal:', error);
      throw error;
    }
  }

  /**
   * Get user's claimed deals
   */
  public async getUserClaims(userId: string): Promise<DealClaim[]> {
    try {
      const userDealIds = this.userClaims.get(userId) || [];
      const allClaims: DealClaim[] = [];

      for (const businessClaims of this.claims.values()) {
        allClaims.push(...businessClaims.filter(claim => claim.userId === userId));
      }

      return allClaims.sort((a, b) => b.claimedAt.getTime() - a.claimedAt.getTime());

    } catch (error) {
      console.error('Error getting user claims:', error);
      return [];
    }
  }

  /**
   * Redeem a claimed deal
   */
  public async redeemDeal(claimId: string, businessId: string): Promise<DealClaim> {
    try {
      const claims = this.claims.get(businessId) || [];
      const claim = claims.find(c => c.id === claimId);
      
      if (!claim) {
        throw new Error('Claim not found');
      }

      if (claim.status !== 'claimed') {
        throw new Error('Deal cannot be redeemed');
      }

      if (claim.expiresAt <= new Date()) {
        claim.status = 'expired';
        throw new Error('Deal has expired');
      }

      claim.status = 'redeemed';
      claim.redeemedAt = new Date();

      this.emit('deal_redeemed', claim);
      return claim;

    } catch (error) {
      console.error('Error redeeming deal:', error);
      throw error;
    }
  }

  /**
   * Get business deals
   */
  public async getBusinessDeals(businessId: string): Promise<LocalDeal[]> {
    try {
      return Array.from(this.deals.values())
        .filter(deal => deal.businessId === businessId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    } catch (error) {
      console.error('Error getting business deals:', error);
      return [];
    }
  }

  /**
   * Get deal analytics
   */
  public async getDealAnalytics(dealId: string, timeRange?: {
    start: Date;
    end: Date;
  }): Promise<DealAnalytics | null> {
    try {
      const deal = this.deals.get(dealId);
      if (!deal) {
        return null;
      }

      // Mock analytics generation
      return {
        dealId,
        timeRange: timeRange || {
          start: deal.createdAt,
          end: new Date()
        },
        totalViews: deal.views,
        uniqueViews: Math.floor(deal.views * 0.8),
        totalClicks: deal.clicks,
        totalClaims: deal.claims,
        totalRedemptions: Math.floor(deal.claims * 0.7),
        conversionRate: deal.views > 0 ? (deal.claims / deal.views) * 100 : 0,
        revenue: deal.revenue,
        claimsByTrustLevel: {
          'new': Math.floor(deal.claims * 0.3),
          'verified': Math.floor(deal.claims * 0.4),
          'veteran': Math.floor(deal.claims * 0.25),
          'elite': Math.floor(deal.claims * 0.05)
        },
        viewsBySite: {
          'gcc': Math.floor(deal.views * 0.6),
          'wtv': Math.floor(deal.views * 0.4)
        },
        viewsByHour: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          views: Math.floor(Math.random() * 50)
        })),
        claimsByDay: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          claims: Math.floor(Math.random() * 10)
        })),
        claimsByLocation: [
          { city: 'Gulf Shores', claims: Math.floor(deal.claims * 0.6) },
          { city: 'Orange Beach', claims: Math.floor(deal.claims * 0.4) }
        ]
      };

    } catch (error) {
      console.error('Error getting deal analytics:', error);
      return null;
    }
  }

  /**
   * Track deal view
   */
  public async trackDealView(dealId: string, userId?: string): Promise<void> {
    try {
      const deal = this.deals.get(dealId);
      if (deal) {
        deal.views++;
      }

      this.emit('deal_viewed', { dealId, userId });

    } catch (error) {
      console.error('Error tracking deal view:', error);
    }
  }

  /**
   * Track deal click
   */
  public async trackDealClick(dealId: string, userId?: string): Promise<void> {
    try {
      const deal = this.deals.get(dealId);
      if (deal) {
        deal.clicks++;
      }

      this.emit('deal_clicked', { dealId, userId });

    } catch (error) {
      console.error('Error tracking deal click:', error);
    }
  }

  /**
   * Check if user meets trust level requirement
   */
  private checkTrustLevel(userLevel: string, requiredLevel: string): boolean {
    const levels: Record<string, number> = { 'new': 0, 'verified': 1, 'veteran': 2, 'elite': 3 };
    const userRank = levels[userLevel] || 0;
    const requiredRank = levels[requiredLevel] || 0;
    return userRank >= requiredRank;
  }

  /**
   * Generate verification code
   */
  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Generate QR code data
   */
  private generateQRCode(dealId: string, userId: string): string {
    return JSON.stringify({
      dealId,
      userId,
      timestamp: Date.now(),
      type: 'deal_claim'
    });
  }

  /**
   * Start periodic tasks
   */
  private startPeriodicTasks(): void {
    if (this.config.autoExpireDeals) {
      // Check for expired deals every hour
      setInterval(() => {
        this.expireDeals();
      }, 60 * 60 * 1000);
    }

    // Clean up expired claims every day
    setInterval(() => {
      this.cleanupExpiredClaims();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Expire outdated deals
   */
  private expireDeals(): void {
    const now = new Date();
    
    for (const deal of this.deals.values()) {
      if (deal.isActive && deal.expiresAt <= now) {
        deal.isActive = false;
        
        // Update business stats
        const business = this.businesses.get(deal.businessId);
        if (business) {
          business.activeDeals--;
          business.updatedAt = new Date();
        }
        
        this.emit('deal_expired', deal);
      }
    }
  }

  /**
   * Clean up expired claims
   */
  private cleanupExpiredClaims(): void {
    const now = new Date();
    
    for (const [businessId, claims] of this.claims.entries()) {
      const validClaims = claims.filter(claim => 
        claim.status === 'claimed' && claim.expiresAt > now ||
        claim.status === 'redeemed'
      );
      
      this.claims.set(businessId, validClaims);
    }
  }

  /**
   * Get businesses
   */
  public getBusinesses(): Business[] {
    return Array.from(this.businesses.values());
  }

  /**
   * Get business by ID
   */
  public getBusiness(businessId: string): Business | undefined {
    return this.businesses.get(businessId);
  }

  /**
   * Add new business
   */
  public async addBusiness(businessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Promise<Business> {
    const business: Business = {
      ...businessData,
      id: `biz-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.businesses.set(business.id, business);
    this.claims.set(business.id, []);

    this.emit('business_added', business);
    return business;
  }

  /**
   * Destroy instance
   */
  public destroy(): void {
    this.removeAllListeners();
  }
}

export default LocalDealExchange;
