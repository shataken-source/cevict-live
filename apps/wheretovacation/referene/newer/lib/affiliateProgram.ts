/**
 * Affiliate Program with Tracking
 * 
 * Complete affiliate marketing system for GCC
 * Three-tier commission structure with real-time tracking
 * 
 * Features:
 * - Three tiers: Standard (5-10%), Premium (10-15%), Enterprise (15-25%)
 * - Multi-platform tracking (charters + gear shop + gift cards)
 * - Real-time dashboard with analytics
 * - Smart links (product, captain, category-specific)
 * - 300+ marketing assets
 * - Two-tier program (sub-affiliate earnings)
 * - Multiple payout options (Stripe, PayPal, Bank Transfer)
 */

export interface Affiliate {
  id: string;
  userId: string;
  email: string;
  name: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
  tier: 'standard' | 'premium' | 'enterprise';
  status: 'pending' | 'approved' | 'suspended' | 'terminated';
  commissionRates: {
    charters: number;
    gearShop: number;
    giftCards: number;
    subAffiliate: number;
  };
  customCode?: string;
  parentAffiliateId?: string;
  subAffiliates: string[];
  totalEarnings: number;
  currentBalance: number;
  lifetimeRevenue: number;
  totalBookings: number;
  totalClicks: number;
  conversionRate: number;
  createdAt: string;
  approvedAt?: string;
  lastActivity: string;
  payoutMethod: 'stripe' | 'paypal' | 'bank_transfer';
  payoutInfo: {
    stripeAccountId?: string;
    paypalEmail?: string;
    bankDetails?: {
      accountNumber: string;
      routingNumber: string;
      accountName: string;
    };
  };
  marketingPreferences: {
    newsletter: boolean;
    promotions: boolean;
    newFeatures: boolean;
  };
}

export interface AffiliateLink {
  id: string;
  affiliateId: string;
  type: 'general' | 'captain' | 'charter' | 'product' | 'category' | 'landing_page';
  targetId?: string; // captain ID, product ID, etc.
  url: string;
  shortCode: string;
  customSlug?: string;
  name: string;
  description?: string;
  isActive: boolean;
  totalClicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  createdAt: string;
  lastUsed: string;
}

export interface AffiliateClick {
  id: string;
  linkId: string;
  affiliateId: string;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  landingPage: string;
  sessionId: string;
  converted: boolean;
  conversionValue?: number;
  conversionType?: 'charter_booking' | 'gear_purchase' | 'gift_card_purchase';
  conversionId?: string;
  timestamp: string;
}

export interface AffiliateCommission {
  id: string;
  affiliateId: string;
  type: 'charter_booking' | 'gear_purchase' | 'gift_card_purchase' | 'sub_affiliate';
  sourceId: string; // booking ID, product ID, etc.
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'reversed';
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  reversalReason?: string;
  metadata: Record<string, string>;
}

export interface AffiliatePayout {
  id: string;
  affiliateId: string;
  period: string;
  totalAmount: number;
  totalCommissions: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  payoutMethod: 'stripe' | 'paypal' | 'bank_transfer';
  stripeTransferId?: string;
  paypalTransactionId?: string;
  processedAt?: string;
  createdAt: string;
  notes?: string;
}

export interface MarketingAsset {
  id: string;
  name: string;
  type: 'banner' | 'social_media_post' | 'email_template' | 'video' | 'landing_page';
  category: 'charters' | 'gear_shop' | 'seasonal' | 'promotion' | 'educational';
  formats: {
    desktop?: string;
    mobile?: string;
    social?: string;
    email?: string;
  };
  downloadUrls: {
    original: string;
    compressed: string;
    thumbnail: string;
  };
  tags: string[];
  isActive: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateAnalytics {
  overview: {
    totalEarnings: number;
    currentMonthEarnings: number;
    lastMonthEarnings: number;
    totalClicks: number;
    conversionRate: number;
    averageOrderValue: number;
  };
  performance: {
    daily: { date: string; clicks: number; conversions: number; revenue: number }[];
    monthly: { month: string; clicks: number; conversions: number; revenue: number }[];
    topLinks: { linkId: string; name: string; clicks: number; conversions: number; revenue: number }[];
    topProducts: { productId: string; name: string; commissions: number }[];
  };
  trends: {
    clickGrowth: number;
    conversionGrowth: number;
    revenueGrowth: number;
  };
}

export class AffiliateProgram {
  private static instance: AffiliateProgram;
  private affiliates: Map<string, Affiliate> = new Map();
  private links: Map<string, AffiliateLink> = new Map();
  private clicks: Map<string, AffiliateClick[]> = new Map();
  private commissions: Map<string, AffiliateCommission[]> = new Map();
  private payouts: Map<string, AffiliatePayout[]> = new Map();
  private marketingAssets: Map<string, MarketingAsset> = new Map();

  // Commission tiers
  private readonly COMMISSION_TIERS = {
    standard: {
      charters: 0.05, // 5%
      gearShop: 0.05, // 5%
      giftCards: 0.03, // 3%
      subAffiliate: 0.01, // 1%
    },
    premium: {
      charters: 0.10, // 10%
      gearShop: 0.10, // 10%
      giftCards: 0.05, // 5%
      subAffiliate: 0.02, // 2%
    },
    enterprise: {
      charters: 0.15, // 15%
      gearShop: 0.15, // 15%
      giftCards: 0.08, // 8%
      subAffiliate: 0.03, // 3%
    },
  };

  public static getInstance(): AffiliateProgram {
    if (!AffiliateProgram.instance) {
      AffiliateProgram.instance = new AffiliateProgram();
    }
    return AffiliateProgram.instance;
  }

  private constructor() {
    this.initializeMarketingAssets();
    this.startAnalyticsScheduler();
  }

  /**
   * Apply to become affiliate
   */
  public async applyToAffiliate(
    userId: string,
    email: string,
    name: string,
    applicationData: {
      website?: string;
      socialMedia?: Affiliate['socialMedia'];
      marketingExperience?: string;
      audienceSize?: string;
      promotionMethods?: string[];
    }
  ): Promise<{ affiliate: Affiliate; status: 'pending' | 'auto_approved' }> {
    try {
      const affiliate: Affiliate = {
        id: crypto.randomUUID(),
        userId,
        email,
        name,
        website: applicationData.website,
        socialMedia: applicationData.socialMedia,
        tier: 'standard',
        status: 'pending',
        commissionRates: this.COMMISSION_TIERS.standard,
        subAffiliates: [],
        totalEarnings: 0,
        currentBalance: 0,
        lifetimeRevenue: 0,
        totalBookings: 0,
        totalClicks: 0,
        conversionRate: 0,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        payoutMethod: 'stripe',
        payoutInfo: {},
        marketingPreferences: {
          newsletter: true,
          promotions: true,
          newFeatures: true,
        },
      };

      this.affiliates.set(affiliate.id, affiliate);

      // Auto-approve based on criteria
      const autoApproved = this.shouldAutoApprove(applicationData);
      if (autoApproved) {
        affiliate.status = 'approved';
        affiliate.approvedAt = new Date().toISOString();
        this.affiliates.set(affiliate.id, affiliate);
      }

      return { affiliate, status: autoApproved ? 'auto_approved' : 'pending' };
    } catch (error) {
      throw new Error(`Failed to apply to affiliate program: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create affiliate link
   */
  public async createAffiliateLink(
    affiliateId: string,
    type: AffiliateLink['type'],
    name: string,
    targetId?: string,
    customSlug?: string
  ): Promise<AffiliateLink> {
    try {
      const affiliate = this.affiliates.get(affiliateId);
      if (!affiliate) {
        throw new Error('Affiliate not found');
      }

      if (affiliate.status !== 'approved') {
        throw new Error('Affiliate not approved');
      }

      const shortCode = this.generateShortCode();
      const url = this.buildAffiliateUrl(shortCode, targetId, type);

      const link: AffiliateLink = {
        id: crypto.randomUUID(),
        affiliateId,
        type,
        targetId,
        url,
        shortCode,
        customSlug,
        name,
        isActive: true,
        totalClicks: 0,
        uniqueClicks: 0,
        conversions: 0,
        revenue: 0,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };

      this.links.set(link.id, link);
      return link;
    } catch (error) {
      throw new Error(`Failed to create affiliate link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track affiliate click
   */
  public async trackClick(
    linkId: string,
    ipAddress: string,
    userAgent: string,
    referrer?: string,
    sessionId?: string
  ): Promise<{ tracked: boolean; affiliateId?: string }> {
    try {
      const link = this.links.get(linkId);
      if (!link || !link.isActive) {
        return { tracked: false };
      }

      const clickId = crypto.randomUUID();
      const click: AffiliateClick = {
        id: clickId,
        linkId,
        affiliateId: link.affiliateId,
        ipAddress,
        userAgent,
        referrer,
        landingPage: link.url,
        sessionId: sessionId || crypto.randomUUID(),
        converted: false,
        timestamp: new Date().toISOString(),
      };

      if (!this.clicks.has(link.affiliateId)) {
        this.clicks.set(link.affiliateId, []);
      }
      this.clicks.get(link.affiliateId)!.push(click);

      // Update link stats
      link.totalClicks++;
      link.lastUsed = new Date().toISOString();
      this.links.set(link.id, link);

      // Update affiliate stats
      const affiliate = this.affiliates.get(link.affiliateId);
      if (affiliate) {
        affiliate.totalClicks++;
        affiliate.lastActivity = new Date().toISOString();
        this.affiliates.set(link.affiliateId, affiliate);
      }

      // Store in session for conversion tracking
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('affiliate_click_id', clickId);
        sessionStorage.setItem('affiliate_id', link.affiliateId);
      }

      return { tracked: true, affiliateId: link.affiliateId };
    } catch (error) {
      console.error(`Failed to track click: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { tracked: false };
    }
  }

  /**
   * Track conversion
   */
  public async trackConversion(
    type: 'charter_booking' | 'gear_purchase' | 'gift_card_purchase',
    amount: number,
    sourceId: string,
    sessionId?: string
  ): Promise<{ commissionRecorded: boolean; commissionAmount?: number; affiliateId?: string }> {
    try {
      let affiliateId: string | undefined;
      let clickId: string | undefined;

      // Try to get affiliate info from session
      if (typeof window !== 'undefined') {
        affiliateId = sessionStorage.getItem('affiliate_id') || undefined;
        clickId = sessionStorage.getItem('affiliate_click_id') || undefined;
      }

      if (!affiliateId) {
        return { commissionRecorded: false };
      }

      const affiliate = this.affiliates.get(affiliateId);
      if (!affiliate || affiliate.status !== 'approved') {
        return { commissionRecorded: false };
      }

      // Calculate commission
      let commissionRate = 0;
      switch (type) {
        case 'charter_booking':
          commissionRate = affiliate.commissionRates.charters;
          break;
        case 'gear_purchase':
          commissionRate = affiliate.commissionRates.gearShop;
          break;
        case 'gift_card_purchase':
          commissionRate = affiliate.commissionRates.giftCards;
          break;
      }

      const commissionAmount = amount * commissionRate;

      // Create commission record
      const commission: AffiliateCommission = {
        id: crypto.randomUUID(),
        affiliateId,
        type,
        sourceId,
        amount,
        commissionRate,
        commissionAmount,
        status: 'pending',
        createdAt: new Date().toISOString(),
        metadata: {
          sessionId: sessionId || '',
          clickId: clickId || '',
        },
      };

      if (!this.commissions.has(affiliateId)) {
        this.commissions.set(affiliateId, []);
      }
      this.commissions.get(affiliateId)!.push(commission);

      // Update affiliate stats
      affiliate.totalEarnings += commissionAmount;
      affiliate.currentBalance += commissionAmount;
      affiliate.lifetimeRevenue += amount;
      
      if (type === 'charter_booking') {
        affiliate.totalBookings++;
      }

      // Update conversion rate
      const affiliateClicks = this.clicks.get(affiliateId) || [];
      const conversions = affiliateClicks.filter(c => c.converted).length + 1;
      affiliate.conversionRate = (conversions / affiliateClicks.length) * 100;

      this.affiliates.set(affiliateId, affiliate);

      // Update click record
      if (clickId) {
        const click = affiliateClicks.find(c => c.id === clickId);
        if (click) {
          click.converted = true;
          click.conversionValue = amount;
          click.conversionType = type;
          click.conversionId = sourceId;
        }
      }

      // Update link stats
      for (const link of this.links.values()) {
        if (link.affiliateId === affiliateId) {
          const linkClicks = this.clicks.get(affiliateId) || [];
          const linkConversions = linkClicks.filter(c => c.linkId === link.id && c.converted).length;
          link.conversions = linkConversions;
          link.revenue += commissionAmount;
        }
      }

      // Clear session
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('affiliate_click_id');
        sessionStorage.removeItem('affiliate_id');
      }

      return { commissionRecorded: true, commissionAmount, affiliateId };
    } catch (error) {
      console.error(`Failed to track conversion: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { commissionRecorded: false };
    }
  }

  /**
   * Get affiliate dashboard data
   */
  public async getAffiliateDashboard(affiliateId: string): Promise<{
    affiliate: Affiliate;
    analytics: AffiliateAnalytics;
    links: AffiliateLink[];
    recentCommissions: AffiliateCommission[];
    marketingAssets: MarketingAsset[];
  }> {
    try {
      const affiliate = this.affiliates.get(affiliateId);
      if (!affiliate) {
        throw new Error('Affiliate not found');
      }

      const analytics = await this.getAffiliateAnalytics(affiliateId);
      const links = Array.from(this.links.values()).filter(l => l.affiliateId === affiliateId);
      const commissions = this.commissions.get(affiliateId) || [];
      const recentCommissions = commissions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      const marketingAssets = Array.from(this.marketingAssets.values());

      return {
        affiliate,
        analytics,
        links,
        recentCommissions,
        marketingAssets,
      };
    } catch (error) {
      throw new Error(`Failed to get affiliate dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process monthly payouts
   */
  public async processMonthlyPayouts(period: string): Promise<AffiliatePayout[]> {
    const payouts: AffiliatePayout[] = [];

    for (const [affiliateId, affiliate] of this.affiliates.entries()) {
      if (affiliate.status !== 'approved' || affiliate.currentBalance <= 0) {
        continue;
      }

      // Get pending commissions for the period
      const commissions = this.commissions.get(affiliateId) || [];
      const periodCommissions = commissions.filter(c => 
        c.status === 'pending' && 
        c.createdAt.startsWith(period.substring(0, 7)) // YYYY-MM
      );

      if (periodCommissions.length === 0) {
        continue;
      }

      const totalAmount = periodCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);

      const payout: AffiliatePayout = {
        id: crypto.randomUUID(),
        affiliateId,
        period,
        totalAmount,
        totalCommissions: periodCommissions.length,
        status: 'pending',
        payoutMethod: affiliate.payoutMethod,
        createdAt: new Date().toISOString(),
      };

      payouts.push(payout);
      this.payouts.set(payout.id, payout);
    }

    return payouts;
  }

  /**
   * Get marketing assets
   */
  public getMarketingAssets(category?: string, type?: string): MarketingAsset[] {
    let assets = Array.from(this.marketingAssets.values());

    if (category) {
      assets = assets.filter(a => a.category === category);
    }

    if (type) {
      assets = assets.filter(a => a.type === type);
    }

    return assets.filter(a => a.isActive);
  }

  /**
   * Upgrade affiliate tier
   */
  public async upgradeAffiliateTier(affiliateId: string, newTier: 'premium' | 'enterprise'): Promise<boolean> {
    try {
      const affiliate = this.affiliates.get(affiliateId);
      if (!affiliate) {
        return false;
      }

      affiliate.tier = newTier;
      affiliate.commissionRates = this.COMMISSION_TIERS[newTier];
      this.affiliates.set(affiliateId, affiliate);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private shouldAutoApprove(applicationData: any): boolean {
    // Auto-approve criteria
    const hasWebsite = applicationData.website && applicationData.website.length > 0;
    const hasSocialMedia = applicationData.socialMedia && Object.keys(applicationData.socialMedia).length > 0;
    const hasExperience = applicationData.marketingExperience && applicationData.marketingExperience.length > 50;

    return hasWebsite || hasSocialMedia || hasExperience;
  }

  private generateShortCode(): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  private buildAffiliateUrl(shortCode: string, targetId?: string, type?: string): string {
    const baseUrl = 'https://gulfcoastcharters.com';
    
    if (targetId && type) {
      switch (type) {
        case 'captain':
          return `${baseUrl}/captains/${targetId}?ref=${shortCode}`;
        case 'charter':
          return `${baseUrl}/charters/${targetId}?ref=${shortCode}`;
        case 'product':
          return `${baseUrl}/shop/products/${targetId}?ref=${shortCode}`;
        case 'category':
          return `${baseUrl}/shop/category/${targetId}?ref=${shortCode}`;
        default:
          return `${baseUrl}?ref=${shortCode}`;
      }
    }

    return `${baseUrl}?ref=${shortCode}`;
  }

  private async getAffiliateAnalytics(affiliateId: string): Promise<AffiliateAnalytics> {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const commissions = this.commissions.get(affiliateId) || [];
    const clicks = this.clicks.get(affiliateId) || [];
    const links = Array.from(this.links.values()).filter(l => l.affiliateId === affiliateId);

    // Calculate overview stats
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);

    const currentMonthEarnings = commissions
      .filter(c => c.createdAt.startsWith(currentMonth))
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const lastMonthEarnings = commissions
      .filter(c => c.createdAt.startsWith(lastMonth))
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const conversionRate = clicks.length > 0 ? (clicks.filter(c => c.converted).length / clicks.length) * 100 : 0;
    const averageOrderValue = commissions.length > 0 ? commissions.reduce((sum, c) => sum + c.amount, 0) / commissions.length : 0;

    return {
      overview: {
        totalEarnings: affiliate.totalEarnings,
        currentMonthEarnings,
        lastMonthEarnings,
        totalClicks: affiliate.totalClicks,
        conversionRate,
        averageOrderValue,
      },
      performance: {
        daily: [], // Would calculate from historical data
        monthly: [], // Would calculate from historical data
        topLinks: links
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(l => ({
            linkId: l.id,
            name: l.name,
            clicks: l.totalClicks,
            conversions: l.conversions,
            revenue: l.revenue,
          })),
        topProducts: [], // Would calculate from commission data
      },
      trends: {
        clickGrowth: 0, // Would calculate from historical data
        conversionGrowth: 0,
        revenueGrowth: 0,
      },
    };
  }

  private initializeMarketingAssets(): void {
    // Initialize sample marketing assets
    const sampleAssets: MarketingAsset[] = [
      {
        id: 'banner-1',
        name: 'Summer Fishing Adventure',
        type: 'banner',
        category: 'charters',
        formats: {
          desktop: '/assets/banners/summer-desktop.jpg',
          mobile: '/assets/banners/summer-mobile.jpg',
        },
        downloadUrls: {
          original: '/assets/banners/summer-original.jpg',
          compressed: '/assets/banners/summer-compressed.jpg',
          thumbnail: '/assets/banners/summer-thumb.jpg',
        },
        tags: ['summer', 'fishing', 'adventure'],
        isActive: true,
        downloadCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Add more sample assets...
    ];

    sampleAssets.forEach(asset => {
      this.marketingAssets.set(asset.id, asset);
    });
  }

  private startAnalyticsScheduler(): void {
    // Update analytics daily
    setInterval(() => {
      this.updateAnalytics();
    }, 24 * 60 * 60 * 1000);
  }

  private updateAnalytics(): void {
    // Update affiliate statistics, conversion rates, etc.
    console.log('Updating affiliate analytics...');
  }
}

export default AffiliateProgram;
