/**
 * Gift Card System with QR Codes
 * 
 * Complete gift card infrastructure for GCC
 * Supports charter certificates and store gift cards
 * 
 * Features:
 * - QR code generation for physical cards
 * - Digital and physical gift cards
 * - Points redemption (10K pts = $200 card)
 * - Smart tiers and scheduled delivery
 * - 5-year validity with automatic expiration
 * - Redemption tracking and analytics
 */

import { StripePaymentSystem } from './stripePaymentSystem';

export interface GiftCard {
  id: string;
  code: string;
  type: 'charter_certificate' | 'store_gift_card';
  amount: number;
  currency: string;
  balance: number;
  purchaserId: string;
  recipientId?: string;
  recipientEmail?: string;
  recipientName?: string;
  message?: string;
  status: 'active' | 'redeemed' | 'expired' | 'cancelled' | 'pending';
  deliveryMethod: 'digital' | 'physical' | 'both';
  qrCodeUrl: string;
  qrCodeImage: string;
  expiresAt?: string;
  createdAt: string;
  deliveredAt?: string;
  redeemedAt?: string;
  redemptionHistory: GiftCardRedemption[];
  metadata: Record<string, string>;
}

export interface GiftCardRedemption {
  id: string;
  giftCardId: string;
  amount: number;
  bookingId?: string;
  productId?: string;
  description: string;
  redeemedBy: string;
  redeemedAt: string;
  remainingBalance: number;
}

export interface GiftCardPurchase {
  id: string;
  purchaserId: string;
  type: 'charter_certificate' | 'store_gift_card';
  amount: number;
  currency: string;
  pointsUsed?: number;
  paymentMethod: 'stripe' | 'points' | 'mixed';
  stripePaymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  totalPaid: number;
  createdAt: string;
  completedAt?: string;
}

export interface GiftCardTemplate {
  id: string;
  name: string;
  type: 'charter_certificate' | 'store_gift_card';
  design: {
    backgroundColor: string;
    textColor: string;
    logoUrl: string;
    pattern: string;
  };
  amounts: number[];
  message: string;
  isActive: boolean;
}

export interface GiftCardAnalytics {
  totalSold: number;
  totalRevenue: number;
  totalRedeemed: number;
  totalValue: number;
  averagePurchaseAmount: number;
  redemptionRate: number;
  topAmounts: { amount: number; count: number }[];
  monthlySales: { month: string; sales: number; revenue: number }[];
}

export class GiftCardSystem {
  private static instance: GiftCardSystem;
  private giftCards: Map<string, GiftCard> = new Map();
  private purchases: Map<string, GiftCardPurchase> = new Map();
  private templates: Map<string, GiftCardTemplate> = new Map();
  private paymentSystem: StripePaymentSystem;

  // Points conversion rate
  private readonly POINTS_TO_DOLLAR_RATE = 50; // 50 points = $1
  private readonly POINTS_FOR_200_CARD = 10000; // 10K points = $200 card

  public static getInstance(): GiftCardSystem {
    if (!GiftCardSystem.instance) {
      GiftCardSystem.instance = new GiftCardSystem();
    }
    return GiftCardSystem.instance;
  }

  private constructor() {
    this.paymentSystem = StripePaymentSystem.getInstance();
    this.initializeTemplates();
    this.startExpirationScheduler();
  }

  /**
   * Create gift card purchase
   */
  public async createGiftCardPurchase(
    purchaserId: string,
    type: 'charter_certificate' | 'store_gift_card',
    amount: number,
    deliveryMethod: 'digital' | 'physical' | 'both',
    recipientInfo?: {
      email: string;
      name: string;
      message?: string;
    },
    pointsToUse: number = 0
  ): Promise<{ purchase: GiftCardPurchase; giftCard: GiftCard }> {
    try {
      // Validate points usage
      const maxPointsUsable = Math.min(pointsToUse, Math.floor(amount * this.POINTS_TO_DOLLAR_RATE));
      const remainingAmount = amount - (maxPointsUsable / this.POINTS_TO_DOLLAR_RATE);
      
      const purchase: GiftCardPurchase = {
        id: crypto.randomUUID(),
        purchaserId,
        type,
        amount,
        currency: 'usd',
        pointsUsed: maxPointsUsable,
        paymentMethod: maxPointsUsable > 0 && remainingAmount > 0 ? 'mixed' : maxPointsUsable > 0 ? 'points' : 'stripe',
        status: 'pending',
        totalPaid: remainingAmount,
        createdAt: new Date().toISOString(),
      };

      // Process payment if needed
      if (remainingAmount > 0) {
        const paymentResult = await this.paymentSystem.createGiftCardPurchase(
          purchaserId,
          remainingAmount,
          type,
          recipientInfo?.email
        );
        
        purchase.stripePaymentIntentId = paymentResult.paymentIntent.id;
        purchase.status = 'completed';
        purchase.completedAt = new Date().toISOString();
        purchase.totalPaid = remainingAmount;
      } else {
        purchase.status = 'completed';
        purchase.completedAt = new Date().toISOString();
      }

      // Create gift card
      const giftCard = await this.createGiftCard(
        purchase.id,
        purchaserId,
        type,
        amount,
        deliveryMethod,
        recipientInfo
      );

      // Store purchase and gift card
      this.purchases.set(purchase.id, purchase);
      this.giftCards.set(giftCard.id, giftCard);

      // Schedule delivery
      if (deliveryMethod === 'digital' || deliveryMethod === 'both') {
        await this.scheduleDigitalDelivery(giftCard);
      }

      return { purchase, giftCard };
    } catch (error) {
      throw new Error(`Failed to create gift card purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Redeem gift card
   */
  public async redeemGiftCard(
    giftCardId: string,
    amount: number,
    redeemedBy: string,
    description: string,
    bookingId?: string,
    productId?: string
  ): Promise<GiftCardRedemption> {
    try {
      const giftCard = this.giftCards.get(giftCardId);
      if (!giftCard) {
        throw new Error('Gift card not found');
      }

      if (giftCard.status !== 'active') {
        throw new Error(`Gift card is ${giftCard.status}`);
      }

      if (giftCard.balance < amount) {
        throw new Error('Insufficient gift card balance');
      }

      if (giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date()) {
        giftCard.status = 'expired';
        this.giftCards.set(giftCardId, giftCard);
        throw new Error('Gift card has expired');
      }

      // Create redemption record
      const redemption: GiftCardRedemption = {
        id: crypto.randomUUID(),
        giftCardId,
        amount,
        bookingId,
        productId,
        description,
        redeemedBy,
        redeemedAt: new Date().toISOString(),
        remainingBalance: giftCard.balance - amount,
      };

      // Update gift card
      giftCard.balance -= amount;
      giftCard.redemptionHistory.push(redemption);
      
      if (giftCard.balance <= 0) {
        giftCard.status = 'redeemed';
        giftCard.redeemedAt = new Date().toISOString();
      }

      this.giftCards.set(giftCardId, giftCard);

      return redemption;
    } catch (error) {
      throw new Error(`Failed to redeem gift card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get gift card by code
   */
  public async getGiftCardByCode(code: string): Promise<GiftCard | null> {
    for (const giftCard of this.giftCards.values()) {
      if (giftCard.code === code) {
        return giftCard;
      }
    }
    return null;
  }

  /**
   * Get user's gift cards
   */
  public async getUserGiftCards(userId: string, includeExpired: boolean = false): Promise<GiftCard[]> {
    const userCards: GiftCard[] = [];
    
    for (const giftCard of this.giftCards.values()) {
      if ((giftCard.purchaserId === userId || giftCard.recipientId === userId) &&
          (includeExpired || giftCard.status === 'active')) {
        userCards.push(giftCard);
      }
    }

    return userCards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Create QR code for gift card
   */
  public async generateGiftCardQR(giftCardId: string): Promise<{ url: string; image: string }> {
    const giftCard = this.giftCards.get(giftCardId);
    if (!giftCard) {
      throw new Error('Gift card not found');
    }

    const qrUrl = `https://gulfcoastcharters.com/gift-cards/${giftCard.code}`;
    const qrImage = await this.generateQRCodeImage(qrUrl);

    return {
      url: qrUrl,
      image: qrImage,
    };
  }

  /**
   * Get gift card analytics
   */
  public async getGiftCardAnalytics(startDate?: Date, endDate?: Date): Promise<GiftCardAnalytics> {
    const allCards = Array.from(this.giftCards.values());
    
    let filteredCards = allCards;
    if (startDate || endDate) {
      filteredCards = allCards.filter(card => {
        const cardDate = new Date(card.createdAt);
        const afterStart = !startDate || cardDate >= startDate;
        const beforeEnd = !endDate || cardDate <= endDate;
        return afterStart && beforeEnd;
      });
    }

    const totalSold = filteredCards.length;
    const totalRevenue = filteredCards.reduce((sum, card) => sum + card.amount, 0);
    const redeemedCards = filteredCards.filter(card => card.status === 'redeemed');
    const totalRedeemed = redeemedCards.length;
    const totalValue = redeemedCards.reduce((sum, card) => sum + (card.amount - card.balance), 0);
    const averagePurchaseAmount = totalSold > 0 ? totalRevenue / totalSold : 0;
    const redemptionRate = totalSold > 0 ? (totalRedeemed / totalSold) * 100 : 0;

    // Calculate top amounts
    const amountCounts: Record<number, number> = {};
    filteredCards.forEach(card => {
      amountCounts[card.amount] = (amountCounts[card.amount] || 0) + 1;
    });
    
    const topAmounts = Object.entries(amountCounts)
      .map(([amount, count]) => ({ amount: Number(amount), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate monthly sales
    const monthlySales: Record<string, { sales: number; revenue: number }> = {};
    filteredCards.forEach(card => {
      const month = new Date(card.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlySales[month]) {
        monthlySales[month] = { sales: 0, revenue: 0 };
      }
      monthlySales[month].sales += 1;
      monthlySales[month].revenue += card.amount;
    });

    return {
      totalSold,
      totalRevenue,
      totalRedeemed,
      totalValue,
      averagePurchaseAmount,
      redemptionRate,
      topAmounts,
      monthlySales: Object.entries(monthlySales).map(([month, data]) => ({
        month,
        sales: data.sales,
        revenue: data.revenue,
      })),
    };
  }

  /**
   * Check gift card balance
   */
  public async checkGiftCardBalance(code: string): Promise<{ balance: number; status: string; expiresAt?: string }> {
    const giftCard = await this.getGiftCardByCode(code);
    if (!giftCard) {
      throw new Error('Gift card not found');
    }

    return {
      balance: giftCard.balance,
      status: giftCard.status,
      expiresAt: giftCard.expiresAt,
    };
  }

  /**
   * Cancel gift card
   */
  public async cancelGiftCard(giftCardId: string, reason: string): Promise<boolean> {
    const giftCard = this.giftCards.get(giftCardId);
    if (!giftCard) {
      return false;
    }

    if (giftCard.status !== 'active') {
      return false;
    }

    giftCard.status = 'cancelled';
    giftCard.metadata = { ...giftCard.metadata, cancellationReason: reason, cancelledAt: new Date().toISOString() };
    
    this.giftCards.set(giftCardId, giftCard);
    return true;
  }

  /**
   * Get available templates
   */
  public getGiftCardTemplates(type?: 'charter_certificate' | 'store_gift_card'): GiftCardTemplate[] {
    const templates = Array.from(this.templates.values());
    return type ? templates.filter(t => t.type === type) : templates;
  }

  /**
   * Private helper methods
   */
  private async createGiftCard(
    purchaseId: string,
    purchaserId: string,
    type: 'charter_certificate' | 'store_gift_card',
    amount: number,
    deliveryMethod: 'digital' | 'physical' | 'both',
    recipientInfo?: {
      email: string;
      name: string;
      message?: string;
    }
  ): Promise<GiftCard> {
    const code = this.generateGiftCardCode();
    const qrData = await this.generateGiftCardQR(code);
    
    const giftCard: GiftCard = {
      id: crypto.randomUUID(),
      code,
      type,
      amount,
      currency: 'usd',
      balance: amount,
      purchaserId,
      recipientId: recipientInfo?.email,
      recipientEmail: recipientInfo?.email,
      recipientName: recipientInfo?.name,
      message: recipientInfo?.message,
      status: 'active',
      deliveryMethod,
      qrCodeUrl: qrData.url,
      qrCodeImage: qrData.image,
      expiresAt: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 5 years
      createdAt: new Date().toISOString(),
      redemptionHistory: [],
      metadata: {
        purchaseId,
        platform: 'gulfcoastcharters',
      },
    };

    return giftCard;
  }

  private generateGiftCardCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'GCC-';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  private async generateQRCodeImage(data: string): Promise<string> {
    // Mock QR code generation - in production, use a library like qrcode
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  }

  private async scheduleDigitalDelivery(giftCard: GiftCard): Promise<void> {
    // Schedule email delivery
    console.log(`Scheduling digital delivery for gift card ${giftCard.id} to ${giftCard.recipientEmail}`);
    
    // In production, this would:
    // 1. Generate a beautiful gift card email
    // 2. Include QR code and card details
    // 3. Send via email service
    // 4. Update delivery status
  }

  private initializeTemplates(): void {
    // Charter certificate templates
    this.templates.set('charter-basic', {
      id: 'charter-basic',
      name: 'Classic Charter Certificate',
      type: 'charter_certificate',
      design: {
        backgroundColor: '#1e40af',
        textColor: '#ffffff',
        logoUrl: '/gcc-logo.png',
        pattern: 'waves',
      },
      amounts: [100, 200, 300, 500],
      message: 'The perfect gift for any fishing enthusiast!',
      isActive: true,
    });

    // Store gift card templates
    this.templates.set('store-basic', {
      id: 'store-basic',
      name: 'GCC Gear Store Gift Card',
      type: 'store_gift_card',
      design: {
        backgroundColor: '#059669',
        textColor: '#ffffff',
        logoUrl: '/gcc-logo.png',
        pattern: 'fish',
      },
      amounts: [50, 100, 150, 250],
      message: 'Gear up for your next adventure!',
      isActive: true,
    });
  }

  private startExpirationScheduler(): void {
    // Check for expired cards daily
    setInterval(() => {
      this.checkExpiredCards();
    }, 24 * 60 * 60 * 1000);
  }

  private checkExpiredCards(): void {
    const now = new Date();
    
    for (const [id, card] of this.giftCards.entries()) {
      if (card.status === 'active' && card.expiresAt && new Date(card.expiresAt) < now) {
        card.status = 'expired';
        this.giftCards.set(id, card);
        
        // Send expiration notification
        console.log(`Gift card ${card.code} has expired`);
      }
    }
  }

  /**
   * Get points redemption options
   */
  public getPointsRedemptionOptions(): {
    pointsNeeded: number;
    cardValue: number;
    description: string;
  }[] {
    return [
      {
        pointsNeeded: 2500,
        cardValue: 50,
        description: '$50 Charter Certificate',
      },
      {
        pointsNeeded: 5000,
        cardValue: 100,
        description: '$100 Charter Certificate',
      },
      {
        pointsNeeded: 10000,
        cardValue: 200,
        description: '$200 Charter Certificate (Best Value!)',
      },
      {
        pointsNeeded: 15000,
        cardValue: 300,
        description: '$300 Charter Certificate',
      },
    ];
  }

  /**
   * Validate gift card for redemption
   */
  public async validateGiftCardForRedemption(code: string, amount: number): Promise<{
    valid: boolean;
    giftCard?: GiftCard;
    error?: string;
  }> {
    try {
      const giftCard = await this.getGiftCardByCode(code);
      
      if (!giftCard) {
        return { valid: false, error: 'Gift card not found' };
      }

      if (giftCard.status !== 'active') {
        return { valid: false, error: `Gift card is ${giftCard.status}` };
      }

      if (giftCard.balance < amount) {
        return { valid: false, error: 'Insufficient balance' };
      }

      if (giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date()) {
        return { valid: false, error: 'Gift card has expired' };
      }

      return { valid: true, giftCard };
    } catch (error) {
      return { valid: false, error: 'Validation failed' };
    }
  }
}

export default GiftCardSystem;
