/**
 * Post-Trip Tipping System
 * 
 * Complete tipping infrastructure for GCC
 * Digital tip option 2 hours after trip completion
 * 
 * Features:
 * - AI-calculated tip suggestions based on trip factors
 * - Quick tip buttons (10%, 15%, 20%, 25%, Custom)
 * - Crew splitting (captain + deck hands)
 * - Only 3% platform fee
 * - Automatic tip requests 2 hours post-trip
 * - Tip history and analytics
 */

import { StripePaymentSystem, TipPayment } from './stripePaymentSystem';

export interface TipRequest {
  id: string;
  bookingId: string;
  customerId: string;
  captainId: string;
  tripDate: string;
  tripDuration: number; // hours
  passengerCount: number;
  tripAmount: number;
  crew: {
    captain: {
      id: string;
      name: string;
      photo: string;
    };
    deckHands: {
      id: string;
      name: string;
      photo: string;
    }[];
  };
  status: 'pending' | 'sent' | 'completed' | 'expired';
  sentAt?: string;
  expiresAt: string;
  suggestedTips: {
    conservative: number; // 10%
    standard: number; // 15%
    generous: number; // 20%
    exceptional: number; // 25%
  };
  aiSuggestions: {
    weatherFactor: number;
    serviceFactor: number;
    experienceFactor: number;
    recommendation: string;
  };
  createdAt: string;
}

export interface Tip {
  id: string;
  tipRequestId: string;
  bookingId: string;
  customerId: string;
  captainId: string;
  amount: number;
  currency: string;
  percentage: number;
  crewSplit: {
    captain: number;
    deckHands: number;
    deckHandAllocations: {
      deckHandId: string;
      amount: number;
    }[];
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  processedAt?: string;
  refundedAt?: string;
  refundReason?: string;
  customerMessage?: string;
  createdAt: string;
}

export interface TipAnalytics {
  totalTips: number;
  totalAmount: number;
  averageTip: number;
  averageTipPercentage: number;
  tipRate: number; // percentage of trips that receive tips
  monthlyTips: { month: string; count: number; amount: number }[];
  topCaptains: { captainId: string; name: string; totalTips: number; tipRate: number }[];
  tipDistribution: {
    under10: number;
    tenTo15: number;
    fifteenTo20: number;
    twentyTo25: number;
    over25: number;
  };
}

export interface TippingPreferences {
  customerId: string;
  defaultTipPercentage: number;
  autoTipEnabled: boolean;
  autoTipAmount: number;
  crewSplitPreference: 'equal' | 'captain_majority' | 'custom';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacy: {
    showTipAmount: boolean;
    allowPublicRecognition: boolean;
  };
}

export class TippingSystem {
  private static instance: TippingSystem;
  private tipRequests: Map<string, TipRequest> = new Map();
  private tips: Map<string, Tip> = new Map();
  private preferences: Map<string, TippingPreferences> = new Map();
  private paymentSystem: StripePaymentSystem;

  // Platform fee for tips (3%)
  private readonly PLATFORM_FEE_RATE = 0.03;
  private readonly TIP_REQUEST_DELAY_HOURS = 2;
  private readonly TIP_REQUEST_EXPIRY_HOURS = 72;

  public static getInstance(): TippingSystem {
    if (!TippingSystem.instance) {
      TippingSystem.instance = new TippingSystem();
    }
    return TippingSystem.instance;
  }

  private constructor() {
    this.paymentSystem = StripePaymentSystem.getInstance();
    this.startTipRequestScheduler();
    this.startExpirationScheduler();
  }

  /**
   * Create tip request for completed booking
   */
  public async createTipRequest(
    bookingId: string,
    customerId: string,
    captainId: string,
    tripData: {
      tripDate: string;
      duration: number;
      passengerCount: number;
      amount: number;
      crew: TipRequest['crew'];
      weatherCondition?: string;
      serviceRating?: number;
      catchSuccess?: boolean;
    }
  ): Promise<TipRequest> {
    try {
      const sentAt = new Date(Date.now() + this.TIP_REQUEST_DELAY_HOURS * 60 * 60 * 1000);
      const expiresAt = new Date(sentAt.getTime() + this.TIP_REQUEST_EXPIRY_HOURS * 60 * 60 * 1000);

      // Calculate suggested tips
      const suggestedTips = this.calculateSuggestedTips(tripData.amount);
      
      // Generate AI suggestions
      const aiSuggestions = this.generateAISuggestions(tripData);

      const tipRequest: TipRequest = {
        id: crypto.randomUUID(),
        bookingId,
        customerId,
        captainId,
        tripDate: tripData.tripDate,
        tripDuration: tripData.duration,
        passengerCount: tripData.passengerCount,
        tripAmount: tripData.amount,
        crew: tripData.crew,
        status: 'pending',
        sentAt: sentAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        suggestedTips,
        aiSuggestions,
        createdAt: new Date().toISOString(),
      };

      this.tipRequests.set(tipRequest.id, tipRequest);

      return tipRequest;
    } catch (error) {
      throw new Error(`Failed to create tip request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send tip request to customer
   */
  public async sendTipRequest(tipRequestId: string): Promise<boolean> {
    try {
      const tipRequest = this.tipRequests.get(tipRequestId);
      if (!tipRequest) {
        return false;
      }

      if (tipRequest.status !== 'pending') {
        return false;
      }

      // Check if it's time to send
      const now = new Date();
      const sendTime = new Date(tipRequest.sentAt!);
      
      if (now < sendTime) {
        return false;
      }

      // Send notifications
      await this.sendTipRequestNotifications(tipRequest);

      tipRequest.status = 'sent';
      this.tipRequests.set(tipRequestId, tipRequest);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Process tip payment
   */
  public async processTipPayment(
    tipRequestId: string,
    amount: number,
    customPercentage?: number,
    crewSplit?: {
      captainPercentage: number;
      deckHandAllocations: { deckHandId: string; percentage: number }[];
    },
    customerMessage?: string
  ): Promise<Tip> {
    try {
      const tipRequest = this.tipRequests.get(tipRequestId);
      if (!tipRequest) {
        throw new Error('Tip request not found');
      }

      if (tipRequest.status !== 'sent') {
        throw new Error('Tip request is not ready for payment');
      }

      if (new Date(tipRequest.expiresAt) < new Date()) {
        tipRequest.status = 'expired';
        this.tipRequests.set(tipRequestId, tipRequest);
        throw new Error('Tip request has expired');
      }

      // Calculate percentage
      const percentage = customPercentage || (amount / tipRequest.tripAmount) * 100;

      // Calculate crew split
      const platformFee = amount * this.PLATFORM_FEE_RATE;
      const amountAfterFee = amount - platformFee;
      
      let captainAmount = amountAfterFee * 0.7; // Default 70% to captain
      let deckHandsAmount = amountAfterFee * 0.3; // Default 30% to deck hands

      if (crewSplit) {
        captainAmount = amountAfterFee * (crewSplit.captainPercentage / 100);
        deckHandsAmount = amountAfterFee * (1 - crewSplit.captainPercentage / 100);
      }

      // Allocate to deck hands
      const deckHandAllocations: { deckHandId: string; amount: number }[] = [];
      if (tipRequest.crew.deckHands.length > 0) {
        const amountPerDeckHand = deckHandsAmount / tipRequest.crew.deckHands.length;
        tipRequest.crew.deckHands.forEach(deckHand => {
          deckHandAllocations.push({
            deckHandId: deckHand.id,
            amount: amountPerDeckHand,
          });
        });
      }

      // Create Stripe payment intent
      const tipPayment = await this.paymentSystem.processTipPayment(
        tipRequest.bookingId,
        tipRequest.customerId,
        tipRequest.captainId,
        amount,
        {
          captain: captainAmount,
          deckHands: deckHandsAmount,
          deckHandIds: tipRequest.crew.deckHands.map(dh => dh.id),
        }
      );

      // Create tip record
      const tip: Tip = {
        id: crypto.randomUUID(),
        tipRequestId,
        bookingId: tipRequest.bookingId,
        customerId: tipRequest.customerId,
        captainId: tipRequest.captainId,
        amount,
        currency: 'usd',
        percentage,
        crewSplit: {
          captain: captainAmount,
          deckHands: deckHandsAmount,
          deckHandAllocations,
        },
        status: 'pending',
        stripePaymentIntentId: tipPayment.stripePaymentIntentId,
        customerMessage,
        createdAt: new Date().toISOString(),
      };

      this.tips.set(tip.id, tip);

      // Update tip request status
      tipRequest.status = 'completed';
      this.tipRequests.set(tipRequestId, tipRequest);

      return tip;
    } catch (error) {
      throw new Error(`Failed to process tip payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get customer's pending tip requests
   */
  public async getCustomerTipRequests(customerId: string): Promise<TipRequest[]> {
    const requests: TipRequest[] = [];
    
    for (const tipRequest of this.tipRequests.values()) {
      if (tipRequest.customerId === customerId && tipRequest.status === 'sent') {
        requests.push(tipRequest);
      }
    }

    return requests.sort((a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime());
  }

  /**
   * Get captain's tip history
   */
  public async getCaptainTips(captainId: string, startDate?: Date, endDate?: Date): Promise<Tip[]> {
    let captainTips = Array.from(this.tips.values()).filter(tip => tip.captainId === captainId);

    if (startDate || endDate) {
      captainTips = captainTips.filter(tip => {
        const tipDate = new Date(tip.createdAt);
        const afterStart = !startDate || tipDate >= startDate;
        const beforeEnd = !endDate || tipDate <= endDate;
        return afterStart && beforeEnd;
      });
    }

    return captainTips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get tipping analytics
   */
  public async getTippingAnalytics(startDate?: Date, endDate?: Date): Promise<TipAnalytics> {
    let allTips = Array.from(this.tips.values()).filter(tip => tip.status === 'completed');

    if (startDate || endDate) {
      allTips = allTips.filter(tip => {
        const tipDate = new Date(tip.createdAt);
        const afterStart = !startDate || tipDate >= startDate;
        const beforeEnd = !endDate || tipDate <= endDate;
        return afterStart && beforeEnd;
      });
    }

    const totalTips = allTips.length;
    const totalAmount = allTips.reduce((sum, tip) => sum + tip.amount, 0);
    const averageTip = totalTips > 0 ? totalAmount / totalTips : 0;
    const averageTipPercentage = totalTips > 0 
      ? allTips.reduce((sum, tip) => sum + tip.percentage, 0) / totalTips 
      : 0;

    // Calculate tip rate (percentage of trips with tips)
    const totalTrips = this.tipRequests.size;
    const tipRate = totalTrips > 0 ? (totalTips / totalTrips) * 100 : 0;

    // Calculate monthly tips
    const monthlyData: Record<string, { count: number; amount: number }> = {};
    allTips.forEach(tip => {
      const month = new Date(tip.createdAt).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { count: 0, amount: 0 };
      }
      monthlyData[month].count += 1;
      monthlyData[month].amount += tip.amount;
    });

    const monthlyTips = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      count: data.count,
      amount: data.amount,
    }));

    // Calculate tip distribution
    const tipDistribution = {
      under10: allTips.filter(tip => tip.percentage < 10).length,
      tenTo15: allTips.filter(tip => tip.percentage >= 10 && tip.percentage < 15).length,
      fifteenTo20: allTips.filter(tip => tip.percentage >= 15 && tip.percentage < 20).length,
      twentyTo25: allTips.filter(tip => tip.percentage >= 20 && tip.percentage < 25).length,
      over25: allTips.filter(tip => tip.percentage >= 25).length,
    };

    // Mock top captains data
    const topCaptains = [
      { captainId: 'captain1', name: 'Captain John', totalTips: 5000, tipRate: 85 },
      { captainId: 'captain2', name: 'Captain Sarah', totalTips: 4500, tipRate: 90 },
      { captainId: 'captain3', name: 'Captain Mike', totalTips: 3800, tipRate: 75 },
    ];

    return {
      totalTips,
      totalAmount,
      averageTip,
      averageTipPercentage,
      tipRate,
      monthlyTips,
      topCaptains,
      tipDistribution,
    };
  }

  /**
   * Set customer tipping preferences
   */
  public async setTippingPreferences(customerId: string, preferences: Partial<TippingPreferences>): Promise<TippingPreferences> {
    const existing = this.preferences.get(customerId) || {
      customerId,
      defaultTipPercentage: 15,
      autoTipEnabled: false,
      autoTipAmount: 0,
      crewSplitPreference: 'equal',
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
      privacy: {
        showTipAmount: true,
        allowPublicRecognition: false,
      },
    };

    const updated = { ...existing, ...preferences };
    this.preferences.set(customerId, updated);

    return updated;
  }

  /**
   * Get customer tipping preferences
   */
  public async getTippingPreferences(customerId: string): Promise<TippingPreferences> {
    return this.preferences.get(customerId) || {
      customerId,
      defaultTipPercentage: 15,
      autoTipEnabled: false,
      autoTipAmount: 0,
      crewSplitPreference: 'equal',
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
      privacy: {
        showTipAmount: true,
        allowPublicRecognition: false,
      },
    };
  }

  /**
   * Refund tip
   */
  public async refundTip(tipId: string, reason: string): Promise<boolean> {
    try {
      const tip = this.tips.get(tipId);
      if (!tip) {
        return false;
      }

      if (tip.status !== 'completed') {
        return false;
      }

      // Process refund through Stripe
      if (tip.stripePaymentIntentId) {
        await this.paymentSystem.processRefund(tip.stripePaymentIntentId, tip.amount, reason);
      }

      tip.status = 'refunded';
      tip.refundedAt = new Date().toISOString();
      tip.refundReason = reason;

      this.tips.set(tipId, tip);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private calculateSuggestedTips(tripAmount: number): TipRequest['suggestedTips'] {
    return {
      conservative: Math.round(tripAmount * 0.10),
      standard: Math.round(tripAmount * 0.15),
      generous: Math.round(tripAmount * 0.20),
      exceptional: Math.round(tripAmount * 0.25),
    };
  }

  private generateAISuggestions(tripData: any): TipRequest['aiSuggestions'] {
    let weatherFactor = 1.0;
    let serviceFactor = 1.0;
    let experienceFactor = 1.0;
    let recommendation = 'Standard 15% tip is appropriate for this trip.';

    // Analyze weather conditions
    if (tripData.weatherCondition === 'storm' || tripData.weatherCondition === 'rough') {
      weatherFactor = 1.2;
      recommendation = 'Consider a generous tip for exceptional service in challenging conditions.';
    } else if (tripData.weatherCondition === 'perfect') {
      weatherFactor = 1.0;
    }

    // Analyze service rating
    if (tripData.serviceRating && tripData.serviceRating >= 4.5) {
      serviceFactor = 1.3;
      recommendation = 'Exceptional service! Consider a 20-25% tip.';
    } else if (tripData.serviceRating && tripData.serviceRating >= 4.0) {
      serviceFactor = 1.1;
    }

    // Analyze experience factors
    if (tripData.catchSuccess) {
      experienceFactor = 1.1;
    }

    if (tripData.duration > 6) {
      experienceFactor *= 1.1;
      recommendation += ' Long trips often deserve extra appreciation.';
    }

    return {
      weatherFactor,
      serviceFactor,
      experienceFactor,
      recommendation,
    };
  }

  private async sendTipRequestNotifications(tipRequest: TipRequest): Promise<void> {
    // Send email, SMS, and push notifications
    console.log(`Sending tip request notifications for booking ${tipRequest.bookingId}`);
    
    // In production, this would:
    // 1. Send email with tip options
    // 2. Send SMS if enabled
    // 3. Send push notification
    // 4. Include crew photos and names
    // 5. Show AI suggestions
  }

  private startTipRequestScheduler(): void {
    // Check for tip requests to send every minute
    setInterval(() => {
      this.processPendingTipRequests();
    }, 60 * 1000);
  }

  private startExpirationScheduler(): void {
    // Check for expired tip requests every hour
    setInterval(() => {
      this.processExpiredTipRequests();
    }, 60 * 60 * 1000);
  }

  private async processPendingTipRequests(): Promise<void> {
    const now = new Date();
    
    for (const [id, tipRequest] of this.tipRequests.entries()) {
      if (tipRequest.status === 'pending' && tipRequest.sentAt && new Date(tipRequest.sentAt) <= now) {
        await this.sendTipRequest(id);
      }
    }
  }

  private async processExpiredTipRequests(): Promise<void> {
    const now = new Date();
    
    for (const [id, tipRequest] of this.tipRequests.entries()) {
      if (tipRequest.status === 'sent' && new Date(tipRequest.expiresAt) < now) {
        tipRequest.status = 'expired';
        this.tipRequests.set(id, tipRequest);
        console.log(`Tip request ${id} has expired`);
      }
    }
  }

  /**
   * Get tip request by booking ID
   */
  public async getTipRequestByBooking(bookingId: string): Promise<TipRequest | null> {
    for (const tipRequest of this.tipRequests.values()) {
      if (tipRequest.bookingId === bookingId) {
        return tipRequest;
      }
    }
    return null;
  }

  /**
   * Get tip statistics for captain
   */
  public async getCaptainTipStats(captainId: string): Promise<{
    totalTips: number;
    totalAmount: number;
    averageTip: number;
    averageTipPercentage: number;
    tipRate: number;
    currentMonthTips: number;
    currentMonthAmount: number;
  }> {
    const captainTips = await this.getCaptainTips(captainId);
    const completedTips = captainTips.filter(tip => tip.status === 'completed');

    const totalTips = completedTips.length;
    const totalAmount = completedTips.reduce((sum, tip) => sum + tip.amount, 0);
    const averageTip = totalTips > 0 ? totalAmount / totalTips : 0;
    const averageTipPercentage = totalTips > 0 
      ? completedTips.reduce((sum, tip) => sum + tip.percentage, 0) / totalTips 
      : 0;

    const totalRequests = Array.from(this.tipRequests.values())
      .filter(request => request.captainId === captainId).length;
    const tipRate = totalRequests > 0 ? (totalTips / totalRequests) * 100 : 0;

    // Current month stats
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthTips = completedTips.filter(tip => 
      tip.createdAt.startsWith(currentMonth)
    );
    const currentMonthAmount = currentMonthTips.reduce((sum, tip) => sum + tip.amount, 0);

    return {
      totalTips,
      totalAmount,
      averageTip,
      averageTipPercentage,
      tipRate,
      currentMonthTips: currentMonthTips.length,
      currentMonthAmount,
    };
  }
}

export default TippingSystem;
