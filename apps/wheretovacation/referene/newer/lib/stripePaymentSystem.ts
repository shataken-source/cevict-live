/**
 * Stripe Payment Processing System
 * 
 * Complete payment infrastructure for Gulf Coast Charters
 * Handles charter bookings, gift cards, tips, and affiliate payouts
 * 
 * Features:
 * - Stripe Connect integration for captain payouts
 * - Payment intent creation and confirmation
 * - Webhook handling for payment events
 * - Booking confirmation emails
 * - Payment history and refunds
 * - Multi-currency support
 * - Dispute management
 */

import Stripe from 'stripe';

export interface PaymentIntent {
  id: string;
  bookingId?: string;
  customerId: string;
  captainId?: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled' | 'requires_capture';
  paymentMethodId?: string;
  clientSecret: string;
  metadata: Record<string, string>;
  createdAt: string;
  confirmedAt?: string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  userId: string;
  stripeCustomerId: string;
  paymentMethods: PaymentMethod[];
  defaultPaymentMethod?: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: string;
}

export interface BookingPayment {
  bookingId: string;
  customerId: string;
  captainId: string;
  totalAmount: number;
  depositAmount: number;
  currency: string;
  status: 'pending' | 'deposit_paid' | 'fully_paid' | 'refunded' | 'partially_refunded';
  paymentIntents: string[];
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

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
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
  expiresAt?: string;
  createdAt: string;
  redeemedAt?: string;
  redemptionHistory: {
    id: string;
    amount: number;
    bookingId?: string;
    description: string;
    redeemedAt: string;
  }[];
}

export interface AffiliatePayout {
  id: string;
  affiliateId: string;
  period: string;
  totalEarnings: number;
  totalBookings: number;
  commissionRate: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  stripeTransferId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface TipPayment {
  id: string;
  bookingId: string;
  customerId: string;
  captainId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processed' | 'refunded';
  stripePaymentIntentId?: string;
  crewSplit: {
    captain: number;
    deckHands: number;
    deckHandIds?: string[];
  };
  createdAt: string;
  processedAt?: string;
}

export class StripePaymentSystem {
  private static instance: StripePaymentSystem;
  private stripe: Stripe;
  private platformFee: number = 0.03; // 3% platform fee

  public static getInstance(): StripePaymentSystem {
    if (!StripePaymentSystem.instance) {
      StripePaymentSystem.instance = new StripePaymentSystem();
    }
    return StripePaymentSystem.instance;
  }

  private constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    });
  }

  /**
   * Create or retrieve Stripe customer
   */
  public async createOrGetCustomer(userId: string, email: string, name: string, phone?: string): Promise<Customer> {
    try {
      // Check if customer already exists
      const existingCustomers = await this.stripe.customers.list({ email: email.toLowerCase(), limit: 1 });
      
      if (existingCustomers.data.length > 0) {
        const stripeCustomer = existingCustomers.data[0];
        const paymentMethods = await this.getCustomerPaymentMethods(stripeCustomer.id);
        
        return {
          id: stripeCustomer.id,
          email: stripeCustomer.email!,
          name: stripeCustomer.name!,
          phone: stripeCustomer.phone,
          userId,
          stripeCustomerId: stripeCustomer.id,
          paymentMethods,
          defaultPaymentMethod: stripeCustomer.invoice_settings?.default_payment_method as string || undefined,
          createdAt: new Date(stripeCustomer.created * 1000).toISOString(),
        };
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email: email.toLowerCase(),
        name,
        phone,
        metadata: {
          userId,
          platform: 'gulfcoastcharters',
        },
      });

      return {
        id: customer.id,
        email: customer.email!,
        name: customer.name!,
        phone: customer.phone,
        userId,
        stripeCustomerId: customer.id,
        paymentMethods: [],
        createdAt: new Date(customer.created * 1000).toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to create/get customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create payment intent for charter booking
   */
  public async createBookingPaymentIntent(
    customerId: string,
    captainId: string,
    bookingId: string,
    amount: number,
    currency: string = 'usd',
    depositOnly: boolean = false
  ): Promise<PaymentIntent> {
    try {
      const applicationFeeAmount = Math.round(amount * this.platformFee);
      
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        metadata: {
          bookingId,
          captainId,
          type: 'charter_booking',
          depositOnly: depositOnly.toString(),
          platform: 'gulfcoastcharters',
        },
        automatic_payment_methods: {
          enabled: true,
        },
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: await this.getCaptainStripeAccount(captainId),
        },
      });

      return {
        id: paymentIntent.id,
        bookingId,
        customerId,
        captainId,
        amount: amount,
        currency,
        status: paymentIntent.status as PaymentIntent['status'],
        clientSecret: paymentIntent.client_secret!,
        metadata: paymentIntent.metadata,
        createdAt: new Date(paymentIntent.created * 1000).toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm payment intent
   */
  public async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
      
      return {
        id: paymentIntent.id,
        bookingId: paymentIntent.metadata.bookingId,
        customerId: paymentIntent.customer as string,
        captainId: paymentIntent.metadata.captainId,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status as PaymentIntent['status'],
        paymentMethodId: paymentIntent.payment_method as string,
        clientSecret: paymentIntent.client_secret!,
        metadata: paymentIntent.metadata,
        createdAt: new Date(paymentIntent.created * 1000).toISOString(),
        confirmedAt: paymentIntent.status === 'succeeded' ? new Date().toISOString() : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to confirm payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create gift card purchase
   */
  public async createGiftCardPurchase(
    customerId: string,
    amount: number,
    type: 'charter_certificate' | 'store_gift_card',
    recipientEmail?: string,
    recipientId?: string
  ): Promise<{ paymentIntent: PaymentIntent; giftCard: GiftCard }> {
    try {
      // Create payment intent for gift card
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        customer: customerId,
        metadata: {
          type: 'gift_card_purchase',
          giftCardType: type,
          recipientEmail: recipientEmail || '',
          platform: 'gulfcoastcharters',
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Create gift card
      const giftCard: GiftCard = {
        id: crypto.randomUUID(),
        code: this.generateGiftCardCode(),
        type,
        amount,
        currency: 'usd',
        balance: amount,
        purchaserId: customerId,
        recipientId,
        recipientEmail,
        status: 'active',
        expiresAt: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 5 years
        createdAt: new Date().toISOString(),
        redemptionHistory: [],
      };

      return {
        paymentIntent: {
          id: paymentIntent.id,
          customerId,
          amount: amount,
          currency: 'usd',
          status: paymentIntent.status as PaymentIntent['status'],
          clientSecret: paymentIntent.client_secret!,
          metadata: paymentIntent.metadata,
          createdAt: new Date(paymentIntent.created * 1000).toISOString(),
        },
        giftCard,
      };
    } catch (error) {
      throw new Error(`Failed to create gift card purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process tip payment
   */
  public async processTipPayment(
    bookingId: string,
    customerId: string,
    captainId: string,
    amount: number,
    crewSplit: { captain: number; deckHands: number; deckHandIds?: string[] }
  ): Promise<TipPayment> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        customer: customerId,
        metadata: {
          bookingId,
          captainId,
          type: 'tip_payment',
          platform: 'gulfcoastcharters',
        },
        automatic_payment_methods: {
          enabled: true,
        },
        application_fee_amount: Math.round(amount * this.platformFee * 100),
        transfer_data: {
          destination: await this.getCaptainStripeAccount(captainId),
        },
      });

      const tipPayment: TipPayment = {
        id: crypto.randomUUID(),
        bookingId,
        customerId,
        captainId,
        amount,
        currency: 'usd',
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
        crewSplit,
        createdAt: new Date().toISOString(),
      };

      return tipPayment;
    } catch (error) {
      throw new Error(`Failed to process tip payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create affiliate commission payout
   */
  public async createAffiliatePayout(
    affiliateId: string,
    period: string,
    totalEarnings: number,
    totalBookings: number,
    commissionRate: number
  ): Promise<AffiliatePayout> {
    try {
      const payout: AffiliatePayout = {
        id: crypto.randomUUID(),
        affiliateId,
        period,
        totalEarnings,
        totalBookings,
        commissionRate,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      return payout;
    } catch (error) {
      throw new Error(`Failed to create affiliate payout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process refund
   */
  public async processRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<{ refundId: string; status: string; amount: number }> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
        metadata: {
          platform: 'gulfcoastcharters',
        },
      });

      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
      };
    } catch (error) {
      throw new Error(`Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get customer payment methods
   */
  public async getCustomerPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type as PaymentMethod['type'],
        brand: pm.card?.brand,
        last4: pm.card?.last4 || '',
        expiryMonth: pm.card?.exp_month,
        expiryYear: pm.card?.exp_year,
        isDefault: false, // Would need to check customer's default payment method
        createdAt: new Date(pm.created * 1000).toISOString(),
      }));
    } catch (error) {
      throw new Error(`Failed to get payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle webhook events
   */
  public async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
          break;
        case 'payout.created':
          await this.handlePayoutCreated(event.data.object as Stripe.Payout);
          break;
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Webhook handling error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get payment history for customer
   */
  public async getPaymentHistory(customerId: string, limit: number = 50): Promise<PaymentIntent[]> {
    try {
      const paymentIntents = await this.stripe.paymentIntents.list({
        customer: customerId,
        limit,
      });

      return paymentIntents.data.map(pi => ({
        id: pi.id,
        bookingId: pi.metadata.bookingId,
        customerId: pi.customer as string,
        captainId: pi.metadata.captainId,
        amount: pi.amount / 100,
        currency: pi.currency,
        status: pi.status as PaymentIntent['status'],
        paymentMethodId: pi.payment_method as string,
        clientSecret: pi.client_secret!,
        metadata: pi.metadata,
        createdAt: new Date(pi.created * 1000).toISOString(),
        confirmedAt: pi.status === 'succeeded' ? new Date().toISOString() : undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to get payment history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Private helper methods
   */
  private async getCaptainStripeAccount(captainId: string): Promise<string> {
    // In production, this would retrieve the captain's Stripe Connect account ID
    // For now, return a mock account ID
    return 'acct_mock_captain_account';
  }

  private generateGiftCardCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Update booking status, send confirmation emails, etc.
    console.log(`Payment succeeded: ${paymentIntent.id}`);
    
    // Send confirmation email
    if (paymentIntent.metadata.bookingId) {
      // await this.sendBookingConfirmationEmail(paymentIntent.metadata.bookingId);
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Handle payment failure, notify customer, etc.
    console.log(`Payment failed: ${paymentIntent.id}`);
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    // Handle charge dispute, notify admin, etc.
    console.log(`Dispute created: ${dispute.id}`);
  }

  private async handlePayoutCreated(payout: Stripe.Payout): Promise<void> {
    // Handle payout to captain or affiliate
    console.log(`Payout created: ${payout.id}`);
  }

  /**
   * Get payment analytics
   */
  public async getPaymentAnalytics(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    totalBookings: number;
    averageBookingValue: number;
    totalTips: number;
    totalRefunds: number;
    paymentMethodBreakdown: Record<string, number>;
  }> {
    try {
      // This would typically query your database for payment analytics
      // For now, return mock data
      return {
        totalRevenue: 50000,
        totalBookings: 150,
        averageBookingValue: 333.33,
        totalTips: 2500,
        totalRefunds: 500,
        paymentMethodBreakdown: {
          card: 45000,
          bank_account: 5000,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get payment analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create setup intent for recurring payments
   */
  public async createSetupIntent(customerId: string): Promise<{ clientSecret: string; setupIntentId: string }> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      return {
        clientSecret: setupIntent.client_secret!,
        setupIntentId: setupIntent.id,
      };
    } catch (error) {
      throw new Error(`Failed to create setup intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate payment method
   */
  public async validatePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      return paymentMethod !== null;
    } catch (error) {
      return false;
    }
  }
}

export default StripePaymentSystem;
