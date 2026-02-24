/**
 * Last-Minute Deals Marketplace
 * 
 * Complete last-minute booking system with dynamic pricing
 * Marketplace for unsold charter slots
 * 
 * Features:
 * - Last-minute booking discounts (up to 50% off)
 * - Dynamic pricing based on demand and time
 * - Real-time availability updates
 * - Flash deals and limited-time offers
 * - Push notifications for hot deals
 * - Captain opt-in system
 * - Deal analytics and optimization
 */

export interface LastMinuteDeal {
  id: string;
  charterId: string;
  captainId: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  tripDate: string;
  tripDuration: number; // hours
  availableSlots: number;
  totalSlots: number;
  status: 'active' | 'sold_out' | 'expired' | 'cancelled';
  dealType: 'flash_sale' | 'last_minute' | 'filler' | 'promotion';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  timeRemaining: number; // hours until deal expires
  restrictions: {
    minAdvanceBooking: number; // hours
    maxPartySize: number;
    blackoutDates: string[];
    newCustomersOnly: boolean;
  };
  marketing: {
    featured: boolean;
    pushNotificationSent: boolean;
    emailPromotion: boolean;
    socialMediaShared: boolean;
  };
  createdAt: string;
  expiresAt: string;
  bookedAt?: string;
  metadata: Record<string, string>;
}

export interface DealBooking {
  id: string;
  dealId: string;
  customerId: string;
  charterId: string;
  numberOfSlots: number;
  totalPrice: number;
  savings: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  bookingCode: string;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  notes?: string;
}

export interface DealAnalytics {
  totalDeals: number;
  activeDeals: number;
  soldDeals: number;
  totalRevenue: number;
  totalSavings: number;
  averageDiscount: number;
  bookingRate: number;
  timeToBook: number; // average hours from deal creation to booking
  topPerformingDeals: {
    dealId: string;
    charterName: string;
    discount: number;
    bookedSlots: number;
    revenue: number;
  }[];
  captainPerformance: {
    captainId: string;
    name: string;
    totalDeals: number;
    soldDeals: number;
    revenue: number;
    averageDiscount: number;
  }[];
  monthlyPerformance: {
    month: string;
    deals: number;
    sold: number;
    revenue: number;
    savings: number;
  }[];
}

export interface DealTemplate {
  id: string;
  name: string;
  description: string;
  discountStrategy: {
    type: 'percentage' | 'fixed' | 'dynamic';
    baseDiscount: number;
    maxDiscount: number;
    timeDecay: number; // discount increases as time gets closer
  };
  eligibility: {
    minHoursBeforeTrip: number;
    maxHoursBeforeTrip: number;
    minFillPercentage: number; // minimum booking percentage to qualify
  };
  restrictions: {
    maxDealsPerWeek: number;
    maxDiscountPerCaptain: number;
    blackoutPeriods: string[];
  };
  marketing: {
    autoFeature: boolean;
    pushNotification: boolean;
    emailPromotion: boolean;
  };
}

export interface DealNotification {
  id: string;
  customerId: string;
  dealId: string;
  type: 'new_deal' | 'price_drop' | 'expiring_soon' | 'sold_out';
  message: string;
  sentAt: string;
  readAt?: string;
  clicked: boolean;
}

export class LastMinuteDealsSystem {
  private static instance: LastMinuteDealsSystem;
  private deals: Map<string, LastMinuteDeal> = new Map();
  private bookings: Map<string, DealBooking> = new Map();
  private templates: Map<string, DealTemplate> = new Map();
  private notifications: Map<string, DealNotification[]> = new Map();

  // Deal configuration
  private readonly MIN_HOURS_BEFORE_TRIP = 48;
  private readonly MAX_DISCOUNT_PERCENTAGE = 50;
  private readonly DEFAULT_DEAL_DURATION_HOURS = 24;
  private readonly FLASH_DEAL_DURATION_HOURS = 6;

  public static getInstance(): LastMinuteDealsSystem {
    if (!LastMinuteDealsSystem.instance) {
      LastMinuteDealsSystem.instance = new LastMinuteDealsSystem();
    }
    return LastMinuteDealsSystem.instance;
  }

  private constructor() {
    this.initializeTemplates();
    this.startDealScheduler();
    this.startExpirationScheduler();
  }

  /**
   * Create last-minute deal
   */
  public async createDeal(
    charterId: string,
    captainId: string,
    tripDate: string,
    originalPrice: number,
    availableSlots: number,
    totalSlots: number,
    dealType: LastMinuteDeal['dealType'] = 'last_minute',
    customDiscount?: number
  ): Promise<LastMinuteDeal> {
    try {
      // Calculate dynamic pricing
      const hoursUntilTrip = this.calculateHoursUntilTrip(tripDate);
      const discountPercentage = customDiscount || this.calculateDiscountPercentage(dealType, hoursUntilTrip, availableSlots, totalSlots);
      
      const discountedPrice = Math.round(originalPrice * (1 - discountPercentage / 100));
      
      const expiresAt = new Date(Date.now() + this.getDealDuration(dealType) * 60 * 60 * 1000);
      
      const deal: LastMinuteDeal = {
        id: crypto.randomUUID(),
        charterId,
        captainId,
        originalPrice,
        discountedPrice,
        discountPercentage,
        tripDate,
        tripDuration: 4, // Default 4 hours
        availableSlots,
        totalSlots,
        status: 'active',
        dealType,
        urgencyLevel: this.calculateUrgencyLevel(hoursUntilTrip, availableSlots, totalSlots),
        timeRemaining: Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)),
        restrictions: {
          minAdvanceBooking: Math.max(2, Math.floor(hoursUntilTrip * 0.5)),
          maxPartySize: totalSlots,
          blackoutDates: [],
          newCustomersOnly: dealType === 'flash_sale',
        },
        marketing: {
          featured: dealType === 'flash_sale',
          pushNotificationSent: false,
          emailPromotion: true,
          socialMediaShared: dealType === 'flash_sale',
        },
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        metadata: {
          created_by: 'system',
          algorithm_version: '1.0',
        },
      };

      this.deals.set(deal.id, deal);

      // Send notifications if it's a hot deal
      if (deal.urgencyLevel === 'high' || deal.urgencyLevel === 'critical') {
        await this.sendDealNotifications(deal);
      }

      return deal;
    } catch (error) {
      throw new Error(`Failed to create deal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Book deal
   */
  public async bookDeal(
    dealId: string,
    customerId: string,
    numberOfSlots: number
  ): Promise<DealBooking> {
    try {
      const deal = this.deals.get(dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      if (deal.status !== 'active') {
        throw new Error(`Deal is ${deal.status}`);
      }

      if (deal.availableSlots < numberOfSlots) {
        throw new Error('Not enough available slots');
      }

      if (new Date(deal.expiresAt) < new Date()) {
        deal.status = 'expired';
        this.deals.set(dealId, deal);
        throw new Error('Deal has expired');
      }

      // Check restrictions
      await this.validateDealRestrictions(deal, customerId, numberOfSlots);

      const totalPrice = deal.discountedPrice * numberOfSlots;
      const savings = (deal.originalPrice - deal.discountedPrice) * numberOfSlots;

      const booking: DealBooking = {
        id: crypto.randomUUID(),
        dealId,
        customerId,
        charterId: deal.charterId,
        numberOfSlots,
        totalPrice,
        savings,
        status: 'pending',
        bookingCode: this.generateBookingCode(),
        createdAt: new Date().toISOString(),
      };

      // Update deal
      deal.availableSlots -= numberOfSlots;
      if (deal.availableSlots <= 0) {
        deal.status = 'sold_out';
        deal.bookedAt = new Date().toISOString();
      }

      this.deals.set(dealId, deal);
      this.bookings.set(booking.id, booking);

      // Send booking confirmation
      await this.sendBookingConfirmation(booking, deal);

      return booking;
    } catch (error) {
      throw new Error(`Failed to book deal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get active deals
   */
  public async getActiveDeals(filters?: {
    captainId?: string;
    dealType?: LastMinuteDeal['dealType'];
    minDiscount?: number;
    maxPrice?: number;
    urgencyLevel?: LastMinuteDeal['urgencyLevel'];
  }): Promise<LastMinuteDeal[]> {
    let activeDeals = Array.from(this.deals.values()).filter(deal => deal.status === 'active');

    // Apply filters
    if (filters) {
      if (filters.captainId) {
        activeDeals = activeDeals.filter(deal => deal.captainId === filters.captainId);
      }
      if (filters.dealType) {
        activeDeals = activeDeals.filter(deal => deal.dealType === filters.dealType);
      }
      if (filters.minDiscount) {
        activeDeals = activeDeals.filter(deal => deal.discountPercentage >= filters.minDiscount!);
      }
      if (filters.maxPrice) {
        activeDeals = activeDeals.filter(deal => deal.discountedPrice <= filters.maxPrice!);
      }
      if (filters.urgencyLevel) {
        activeDeals = activeDeals.filter(deal => deal.urgencyLevel === filters.urgencyLevel);
      }
    }

    // Sort by urgency and time remaining
    return activeDeals.sort((a, b) => {
      // First sort by urgency level
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const urgencyDiff = urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel];
      
      if (urgencyDiff !== 0) return urgencyDiff;
      
      // Then sort by time remaining (ascending - less time first)
      return a.timeRemaining - b.timeRemaining;
    });
  }

  /**
   * Get customer's deal bookings
   */
  public async getCustomerDealBookings(customerId: string): Promise<DealBooking[]> {
    const customerBookings: DealBooking[] = [];
    
    for (const booking of this.bookings.values()) {
      if (booking.customerId === customerId) {
        customerBookings.push(booking);
      }
    }

    return customerBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get captain's deals
   */
  public async getCaptainDeals(captainId: string): Promise<LastMinuteDeal[]> {
    const captainDeals: LastMinuteDeal[] = [];
    
    for (const deal of this.deals.values()) {
      if (deal.captainId === captainId) {
        captainDeals.push(deal);
      }
    }

    return captainDeals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Update deal pricing
   */
  public async updateDealPricing(dealId: string): Promise<boolean> {
    try {
      const deal = this.deals.get(dealId);
      if (!deal || deal.status !== 'active') {
        return false;
      }

      const hoursUntilTrip = this.calculateHoursUntilTrip(deal.tripDate);
      const newDiscountPercentage = this.calculateDiscountPercentage(deal.dealType, hoursUntilTrip, deal.availableSlots, deal.totalSlots);
      
      if (newDiscountPercentage > deal.discountPercentage && newDiscountPercentage <= this.MAX_DISCOUNT_PERCENTAGE) {
        const oldPrice = deal.discountedPrice;
        deal.discountPercentage = newDiscountPercentage;
        deal.discountedPrice = Math.round(deal.originalPrice * (1 - newDiscountPercentage / 100));
        deal.urgencyLevel = this.calculateUrgencyLevel(hoursUntilTrip, deal.availableSlots, deal.totalSlots);
        
        this.deals.set(dealId, deal);

        // Send price drop notification
        await this.sendPriceDropNotification(deal, oldPrice);
        
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cancel deal
   */
  public async cancelDeal(dealId: string, reason: string): Promise<boolean> {
    try {
      const deal = this.deals.get(dealId);
      if (!deal) {
        return false;
      }

      if (deal.status !== 'active') {
        return false;
      }

      deal.status = 'cancelled';
      deal.metadata = {
        ...deal.metadata,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      };

      this.deals.set(dealId, deal);

      // Handle cancellations for existing bookings
      await this.handleDealCancellation(deal, reason);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get deal analytics
   */
  public async getDealAnalytics(startDate?: Date, endDate?: Date): Promise<DealAnalytics> {
    let allDeals = Array.from(this.deals.values());
    let allBookings = Array.from(this.bookings.values()).filter(booking => booking.status === 'confirmed');

    if (startDate || endDate) {
      allDeals = allDeals.filter(deal => {
        const dealDate = new Date(deal.createdAt);
        const afterStart = !startDate || dealDate >= startDate;
        const beforeEnd = !endDate || dealDate <= endDate;
        return afterStart && beforeEnd;
      });

      allBookings = allBookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        const afterStart = !startDate || bookingDate >= startDate;
        const beforeEnd = !endDate || bookingDate <= endDate;
        return afterStart && beforeEnd;
      });
    }

    const totalDeals = allDeals.length;
    const activeDeals = allDeals.filter(deal => deal.status === 'active').length;
    const soldDeals = allDeals.filter(deal => deal.status === 'sold_out').length;
    const totalRevenue = allBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
    const totalSavings = allBookings.reduce((sum, booking) => sum + booking.savings, 0);
    const averageDiscount = totalDeals > 0 
      ? allDeals.reduce((sum, deal) => sum + deal.discountPercentage, 0) / totalDeals 
      : 0;
    const bookingRate = totalDeals > 0 ? (soldDeals / totalDeals) * 100 : 0;

    // Calculate time to book
    const bookingTimes = allBookings.map(booking => {
      const deal = this.deals.get(booking.dealId);
      if (deal) {
        return (new Date(booking.createdAt).getTime() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60);
      }
      return 0;
    }).filter(time => time > 0);

    const timeToBook = bookingTimes.length > 0 
      ? bookingTimes.reduce((sum, time) => sum + time, 0) / bookingTimes.length 
      : 0;

    // Mock top performing deals
    const topPerformingDeals = [
      {
        dealId: 'deal1',
        charterName: 'Deep Sea Adventure',
        discount: 30,
        bookedSlots: 6,
        revenue: 2100,
      },
      {
        dealId: 'deal2',
        charterName: 'Bay Fishing Special',
        discount: 25,
        bookedSlots: 4,
        revenue: 1200,
      },
    ];

    // Mock captain performance
    const captainPerformance = [
      {
        captainId: 'captain1',
        name: 'Captain John',
        totalDeals: 15,
        soldDeals: 12,
        revenue: 8500,
        averageDiscount: 22,
      },
      {
        captainId: 'captain2',
        name: 'Captain Sarah',
        totalDeals: 10,
        soldDeals: 8,
        revenue: 6200,
        averageDiscount: 25,
      },
    ];

    // Calculate monthly performance
    const monthlyData: Record<string, { deals: number; sold: number; revenue: number; savings: number }> = {};
    allDeals.forEach(deal => {
      const month = new Date(deal.createdAt).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { deals: 0, sold: 0, revenue: 0, savings: 0 };
      }
      monthlyData[month].deals += 1;
      if (deal.status === 'sold_out') {
        monthlyData[month].sold += 1;
      }
    });

    allBookings.forEach(booking => {
      const month = new Date(booking.createdAt).toISOString().slice(0, 7);
      if (monthlyData[month]) {
        monthlyData[month].revenue += booking.totalPrice;
        monthlyData[month].savings += booking.savings;
      }
    });

    const monthlyPerformance = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      deals: data.deals,
      sold: data.sold,
      revenue: data.revenue,
      savings: data.savings,
    }));

    return {
      totalDeals,
      activeDeals,
      soldDeals,
      totalRevenue,
      totalSavings,
      averageDiscount,
      bookingRate,
      timeToBook,
      topPerformingDeals,
      captainPerformance,
      monthlyPerformance,
    };
  }

  /**
   * Private helper methods
   */
  private calculateHoursUntilTrip(tripDate: string): number {
    const tripDateTime = new Date(tripDate).getTime();
    const now = Date.now();
    return Math.max(0, (tripDateTime - now) / (1000 * 60 * 60));
  }

  private calculateDiscountPercentage(
    dealType: LastMinuteDeal['dealType'],
    hoursUntilTrip: number,
    availableSlots: number,
    totalSlots: number
  ): number {
    let baseDiscount = 10; // Start with 10%

    // Adjust based on deal type
    switch (dealType) {
      case 'flash_sale':
        baseDiscount = 25;
        break;
      case 'last_minute':
        baseDiscount = 15;
        break;
      case 'filler':
        baseDiscount = 20;
        break;
      case 'promotion':
        baseDiscount = 12;
        break;
    }

    // Time-based adjustment (closer = higher discount)
    if (hoursUntilTrip < 24) {
      baseDiscount += 15;
    } else if (hoursUntilTrip < 48) {
      baseDiscount += 10;
    } else if (hoursUntilTrip < 72) {
      baseDiscount += 5;
    }

    // Availability-based adjustment (more slots = higher discount)
    const fillPercentage = (totalSlots - availableSlots) / totalSlots;
    if (fillPercentage < 0.3) {
      baseDiscount += 10;
    } else if (fillPercentage < 0.5) {
      baseDiscount += 5;
    }

    return Math.min(baseDiscount, this.MAX_DISCOUNT_PERCENTAGE);
  }

  private calculateUrgencyLevel(
    hoursUntilTrip: number,
    availableSlots: number,
    totalSlots: number
  ): LastMinuteDeal['urgencyLevel'] {
    if (hoursUntilTrip < 12 && availableSlots > 2) {
      return 'critical';
    } else if (hoursUntilTrip < 24 && availableSlots > 1) {
      return 'high';
    } else if (hoursUntilTrip < 48) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private getDealDuration(dealType: LastMinuteDeal['dealType']): number {
    switch (dealType) {
      case 'flash_sale':
        return this.FLASH_DEAL_DURATION_HOURS;
      default:
        return this.DEFAULT_DEAL_DURATION_HOURS;
    }
  }

  private async validateDealRestrictions(
    deal: LastMinuteDeal,
    customerId: string,
    numberOfSlots: number
  ): Promise<void> {
    // Check advance booking requirement
    const hoursUntilTrip = this.calculateHoursUntilTrip(deal.tripDate);
    if (hoursUntilTrip < deal.restrictions.minAdvanceBooking) {
      throw new Error(`Booking must be made at least ${deal.restrictions.minAdvanceBooking} hours in advance`);
    }

    // Check party size
    if (numberOfSlots > deal.restrictions.maxPartySize) {
      throw new Error(`Party size cannot exceed ${deal.restrictions.maxPartySize} people`);
    }

    // Check new customer restriction
    if (deal.restrictions.newCustomersOnly) {
      // In production, check if customer is new
      console.log('Checking if customer is new...');
    }

    // Check blackout dates
    const today = new Date().toDateString();
    for (const blackoutDate of deal.restrictions.blackoutDates) {
      if (new Date(blackoutDate).toDateString() === today) {
        throw new Error('Deal is not available on this date');
      }
    }
  }

  private generateBookingCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'DEAL-';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  private async sendDealNotifications(deal: LastMinuteDeal): Promise<void> {
    console.log(`Sending notifications for hot deal ${deal.id} (${deal.discountPercentage}% off)`);
    deal.marketing.pushNotificationSent = true;
    this.deals.set(deal.id, deal);
  }

  private async sendBookingConfirmation(booking: DealBooking, deal: LastMinuteDeal): Promise<void> {
    console.log(`Sending booking confirmation for ${booking.bookingCode}`);
    booking.status = 'confirmed';
    booking.confirmedAt = new Date().toISOString();
    this.bookings.set(booking.id, booking);
  }

  private async sendPriceDropNotification(deal: LastMinuteDeal, oldPrice: number): Promise<void> {
    console.log(`Sending price drop notification for deal ${deal.id}: $${oldPrice} → $${deal.discountedPrice}`);
  }

  private async handleDealCancellation(deal: LastMinuteDeal, reason: string): Promise<void> {
    // Find and cancel related bookings
    const affectedBookings = Array.from(this.bookings.values())
      .filter(booking => booking.dealId === deal.id && booking.status === 'confirmed');

    for (const booking of affectedBookings) {
      booking.status = 'cancelled';
      booking.cancelledAt = new Date().toISOString();
      booking.notes = `Deal cancelled: ${reason}`;
      this.bookings.set(booking.id, booking);
      
      // Send cancellation notification
      console.log(`Cancelling booking ${booking.bookingCode} due to deal cancellation`);
    }
  }

  private initializeTemplates(): void {
    // Flash sale template
    this.templates.set('flash_sale', {
      id: 'flash_sale',
      name: 'Flash Sale',
      description: 'Limited time flash sales with deep discounts',
      discountStrategy: {
        type: 'percentage',
        baseDiscount: 25,
        maxDiscount: 50,
        timeDecay: 0.1,
      },
      eligibility: {
        minHoursBeforeTrip: 12,
        maxHoursBeforeTrip: 48,
        minFillPercentage: 0.3,
      },
      restrictions: {
        maxDealsPerWeek: 3,
        maxDiscountPerCaptain: 40,
        blackoutPeriods: [],
      },
      marketing: {
        autoFeature: true,
        pushNotification: true,
        emailPromotion: true,
      },
    });

    // Last minute template
    this.templates.set('last_minute', {
      id: 'last_minute',
      name: 'Last Minute',
      description: 'Standard last-minute deals',
      discountStrategy: {
        type: 'dynamic',
        baseDiscount: 15,
        maxDiscount: 35,
        timeDecay: 0.05,
      },
      eligibility: {
        minHoursBeforeTrip: 24,
        maxHoursBeforeTrip: 72,
        minFillPercentage: 0.4,
      },
      restrictions: {
        maxDealsPerWeek: 5,
        maxDiscountPerCaptain: 30,
        blackoutPeriods: [],
      },
      marketing: {
        autoFeature: false,
        pushNotification: true,
        emailPromotion: true,
      },
    });
  }

  private startDealScheduler(): void {
    // Update deal pricing every hour
    setInterval(() => {
      this.updateAllDealPricing();
    }, 60 * 60 * 1000);
  }

  private startExpirationScheduler(): void {
    // Check for expired deals every 10 minutes
    setInterval(() => {
      this.checkExpiredDeals();
    }, 10 * 60 * 1000);
  }

  private async updateAllDealPricing(): Promise<void> {
    for (const [dealId, deal] of this.deals.entries()) {
      if (deal.status === 'active') {
        await this.updateDealPricing(dealId);
      }
    }
  }

  private checkExpiredDeals(): void {
    const now = new Date();
    
    for (const [id, deal] of this.deals.entries()) {
      if (deal.status === 'active' && new Date(deal.expiresAt) < now) {
        deal.status = 'expired';
        this.deals.set(id, deal);
        console.log(`Deal ${id} has expired`);
      }
    }
  }

  /**
   * Get deal by ID
   */
  public async getDealById(dealId: string): Promise<LastMinuteDeal | null> {
    return this.deals.get(dealId) || null;
  }

  /**
   * Get booking by code
   */
  public async getBookingByCode(bookingCode: string): Promise<DealBooking | null> {
    for (const booking of this.bookings.values()) {
      if (booking.bookingCode === bookingCode) {
        return booking;
      }
    }
    return null;
  }
}

export default LastMinuteDealsSystem;
