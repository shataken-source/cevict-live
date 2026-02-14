/**
 * Affiliate Link Tracking Service
 * Monetize sportsbook links with click tracking and revenue attribution
 */

import { createClient } from '@supabase/supabase-js';

export interface SportsbookAffiliate {
  name: string;
  baseUrl: string;
  affiliateId: string;
  commissionType: 'cpa' | 'revenue_share' | 'hybrid';
  commissionRate: number;
  regions: string[];
  active: boolean;
}

export interface TrackedLink {
  pickId: string;
  gameId: string;
  sportsbook: string;
  originalUrl: string;
  affiliateUrl: string;
  createdAt: string;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface ClickAnalytics {
  totalClicks: number;
  uniqueClicks: number;
  conversionRate: number;
  totalRevenue: number;
  topSportsbooks: Array<{ name: string; clicks: number; revenue: number }>;
  topPicks: Array<{ pickId: string; clicks: number; revenue: number }>;
}

export class AffiliateTrackingService {
  private supabase: ReturnType<typeof createClient>;
  private sportsbooks: SportsbookAffiliate[];

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials required');
    }
    this.supabase = createClient(url, key);

    // Initialize sportsbook affiliate programs
    this.sportsbooks = this.initializeSportsbooks();
  }

  /**
   * Generate tracked affiliate link for a pick
   */
  async generateTrackedLink(
    pickId: string,
    gameId: string,
    sportsbookName: string,
    userRegion: string = 'US'
  ): Promise<string | null> {
    const sportsbook = this.sportsbooks.find(
      sb => sb.name.toLowerCase() === sportsbookName.toLowerCase() && 
            sb.regions.includes(userRegion) && 
            sb.active
    );

    if (!sportsbook) {
      console.log(`[Affiliate] No active affiliate program for ${sportsbookName} in ${userRegion}`);
      return null;
    }

    const affiliateUrl = this.buildAffiliateUrl(sportsbook, pickId, gameId);

    // Store link in database
    await this.storeTrackedLink({
      pickId,
      gameId,
      sportsbook: sportsbook.name,
      originalUrl: sportsbook.baseUrl,
      affiliateUrl,
      createdAt: new Date().toISOString(),
      clicks: 0,
      conversions: 0,
      revenue: 0,
    });

    return affiliateUrl;
  }

  /**
   * Record a click on an affiliate link
   */
  async recordClick(
    pickId: string,
    sportsbookName: string,
    metadata: {
      userAgent?: string;
      ipAddress?: string;
      referrer?: string;
      timestamp?: string;
    }
  ): Promise<void> {
    const timestamp = metadata.timestamp || new Date().toISOString();

    // Insert click record
    const { error } = await this.supabase
      .from('affiliate_clicks')
      .insert({
        pick_id: pickId,
        sportsbook: sportsbookName,
        user_agent: metadata.userAgent,
        ip_hash: metadata.ipAddress ? this.hashIp(metadata.ipAddress) : null,
        referrer: metadata.referrer,
        clicked_at: timestamp,
      });

    if (error) {
      console.error('[Affiliate] Error recording click:', error);
      return;
    }

    // Increment click count on tracked link
    await this.supabase.rpc('increment_clicks', {
      p_pick_id: pickId,
      p_sportsbook: sportsbookName,
    });
  }

  /**
   * Record a conversion (signup/deposit)
   */
  async recordConversion(
    pickId: string,
    sportsbookName: string,
    conversionValue: number,
    conversionType: 'signup' | 'deposit' | 'wager'
  ): Promise<void> {
    const sportsbook = this.sportsbooks.find(
      sb => sb.name.toLowerCase() === sportsbookName.toLowerCase()
    );

    if (!sportsbook) return;

    // Calculate commission
    const commission = this.calculateCommission(
      conversionValue, 
      sportsbook.commissionType, 
      sportsbook.commissionRate
    );

    // Insert conversion record
    const { error } = await this.supabase
      .from('affiliate_conversions')
      .insert({
        pick_id: pickId,
        sportsbook: sportsbookName,
        conversion_type: conversionType,
        conversion_value: conversionValue,
        commission,
        converted_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[Affiliate] Error recording conversion:', error);
      return;
    }

    // Update tracked link revenue
    await this.supabase.rpc('update_revenue', {
      p_pick_id: pickId,
      p_sportsbook: sportsbookName,
      p_revenue: commission,
    });
  }

  /**
   * Get analytics dashboard data
   */
  async getAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<ClickAnalytics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    // Fetch clicks
    const { data: clicks, error: clicksError } = await this.supabase
      .from('affiliate_clicks')
      .select('*')
      .gte('clicked_at', start)
      .lte('clicked_at', end);

    if (clicksError || !clicks) {
      return this.emptyAnalytics();
    }

    // Fetch conversions
    const { data: conversions, error: convError } = await this.supabase
      .from('affiliate_conversions')
      .select('*')
      .gte('converted_at', start)
      .lte('converted_at', end);

    if (convError) {
      return this.emptyAnalytics();
    }

    // Calculate metrics
    const totalClicks = clicks.length;
    const uniqueIps = new Set(clicks.map(c => c.ip_hash).filter(Boolean));
    const totalRevenue = conversions?.reduce((sum, c) => sum + (c.commission || 0), 0) || 0;

    // Sportsbook breakdown
    const sportsbookStats: Record<string, { clicks: number; revenue: number }> = {};
    for (const click of clicks) {
      const sb = click.sportsbook;
      if (!sportsbookStats[sb]) sportsbookStats[sb] = { clicks: 0, revenue: 0 };
      sportsbookStats[sb].clicks++;
    }
    for (const conv of conversions || []) {
      const sb = conv.sportsbook;
      if (sportsbookStats[sb]) {
        sportsbookStats[sb].revenue += conv.commission || 0;
      }
    }

    // Pick breakdown
    const pickStats: Record<string, { clicks: number; revenue: number }> = {};
    for (const click of clicks) {
      const pid = click.pick_id;
      if (!pickStats[pid]) pickStats[pid] = { clicks: 0, revenue: 0 };
      pickStats[pid].clicks++;
    }
    for (const conv of conversions || []) {
      const pid = conv.pick_id;
      if (pickStats[pid]) {
        pickStats[pid].revenue += conv.commission || 0;
      }
    }

    return {
      totalClicks,
      uniqueClicks: uniqueIps.size,
      conversionRate: totalClicks > 0 ? ((conversions?.length || 0) / totalClicks) * 100 : 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      topSportsbooks: Object.entries(sportsbookStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      topPicks: Object.entries(pickStats)
        .map(([pickId, stats]) => ({ pickId, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
    };
  }

  /**
   * Get best sportsbook for a user based on region and odds
   */
  getBestSportsbook(
    userRegion: string,
    preferredBooks?: string[]
  ): SportsbookAffiliate | null {
    const available = this.sportsbooks.filter(
      sb => sb.regions.includes(userRegion) && sb.active
    );

    if (available.length === 0) return null;

    // If user has preferences, check those first
    if (preferredBooks && preferredBooks.length > 0) {
      const preferred = available.find(sb => 
        preferredBooks.some(pb => 
          sb.name.toLowerCase().includes(pb.toLowerCase())
        )
      );
      if (preferred) return preferred;
    }

    // Return highest commission rate
    return available.sort((a, b) => b.commissionRate - a.commissionRate)[0];
  }

  /**
   * Generate affiliate links for all active picks
   */
  async generateLinksForPicks(
    picks: Array<{
      id: string;
      gameId: string;
      recommendedBooks: string[];
    }>,
    userRegion: string = 'US'
  ): Promise<Record<string, string[]>> {
    const links: Record<string, string[]> = {};

    for (const pick of picks) {
      links[pick.id] = [];
      
      for (const bookName of pick.recommendedBooks) {
        const url = await this.generateTrackedLink(
          pick.id,
          pick.gameId,
          bookName,
          userRegion
        );
        
        if (url) {
          links[pick.id].push(url);
        }
      }
    }

    return links;
  }

  private initializeSportsbooks(): SportsbookAffiliate[] {
    return [
      {
        name: 'DraftKings',
        baseUrl: 'https://sportsbook.draftkings.com',
        affiliateId: process.env.DRAFTKINGS_AFFILIATE_ID || '',
        commissionType: 'revenue_share',
        commissionRate: 0.25,
        regions: ['US'],
        active: !!process.env.DRAFTKINGS_AFFILIATE_ID,
      },
      {
        name: 'FanDuel',
        baseUrl: 'https://sportsbook.fanduel.com',
        affiliateId: process.env.FANDUEL_AFFILIATE_ID || '',
        commissionType: 'cpa',
        commissionRate: 50,
        regions: ['US'],
        active: !!process.env.FANDUEL_AFFILIATE_ID,
      },
      {
        name: 'BetMGM',
        baseUrl: 'https://sports.betmgm.com',
        affiliateId: process.env.BETMGM_AFFILIATE_ID || '',
        commissionType: 'revenue_share',
        commissionRate: 0.20,
        regions: ['US'],
        active: !!process.env.BETMGM_AFFILIATE_ID,
      },
      {
        name: 'Caesars',
        baseUrl: 'https://sportsbook.caesars.com',
        affiliateId: process.env.CAESARS_AFFILIATE_ID || '',
        commissionType: 'hybrid',
        commissionRate: 35,
        regions: ['US'],
        active: !!process.env.CAESARS_AFFILIATE_ID,
      },
      {
        name: 'Pinnacle',
        baseUrl: 'https://www.pinnacle.com',
        affiliateId: process.env.PINNACLE_AFFILIATE_ID || '',
        commissionType: 'revenue_share',
        commissionRate: 0.30,
        regions: ['GLOBAL'],
        active: !!process.env.PINNACLE_AFFILIATE_ID,
      },
    ];
  }

  private buildAffiliateUrl(sportsbook: SportsbookAffiliate, pickId: string, gameId: string): string {
    const baseUrl = sportsbook.baseUrl;
    const trackingParams = `?aff=${sportsbook.affiliateId}&sub1=${pickId}&sub2=${gameId}&utm_source=progno`;
    
    // Some sportsbooks have different URL structures
    if (sportsbook.name === 'DraftKings') {
      return `${baseUrl}/league/football${trackingParams}`;
    }
    if (sportsbook.name === 'FanDuel') {
      return `${baseUrl}/sportsbook${trackingParams}`;
    }
    
    return `${baseUrl}${trackingParams}`;
  }

  private async storeTrackedLink(link: TrackedLink): Promise<void> {
    const { error } = await this.supabase
      .from('tracked_links')
      .upsert({
        pick_id: link.pickId,
        game_id: link.gameId,
        sportsbook: link.sportsbook,
        original_url: link.originalUrl,
        affiliate_url: link.affiliateUrl,
        created_at: link.createdAt,
        clicks: link.clicks,
        conversions: link.conversions,
        revenue: link.revenue,
      });

    if (error) {
      console.error('[Affiliate] Error storing link:', error);
    }
  }

  private calculateCommission(
    value: number,
    type: SportsbookAffiliate['commissionType'],
    rate: number
  ): number {
    switch (type) {
      case 'cpa':
        return rate; // Fixed amount per conversion
      case 'revenue_share':
        return value * rate; // Percentage of revenue
      case 'hybrid':
        return rate + (value * 0.10); // Fixed + small percentage
      default:
        return 0;
    }
  }

  private hashIp(ip: string): string {
    // Simple hash for privacy
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  private emptyAnalytics(): ClickAnalytics {
    return {
      totalClicks: 0,
      uniqueClicks: 0,
      conversionRate: 0,
      totalRevenue: 0,
      topSportsbooks: [],
      topPicks: [],
    };
  }
}

export default AffiliateTrackingService;
