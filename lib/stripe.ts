/**
 * Stripe Payment Integration for SmokersRights
 *
 * Handles payment processing for premium features, donations, and subscriptions
 */

import Stripe from 'stripe';

// Initialize Stripe with fallback for build time
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    })
  : null;

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
  metadata?: Record<string, string>;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  type: 'subscription' | 'one_time' | 'donation';
  features?: string[];
}

export class StripeService {
  private static instance: StripeService;
  private stripe: Stripe | null;

  constructor() {
    this.stripe = stripe;
  }

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  private checkStripe(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe is not initialized. Missing STRIPE_SECRET_KEY environment variable.');
    }
    return this.stripe;
  }

  /**
   * Create a payment intent for one-time payments
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, string>
  ): Promise<PaymentIntent> {
    try {
      const stripeInstance = this.checkStripe();
      const paymentIntent = await stripeInstance.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret!,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Create a subscription checkout session
   */
  async createSubscriptionSession(
    priceId: string,
    customerId?: string,
    successUrl: string = `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    cancelUrl: string = `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`
  ): Promise<{ sessionId: string; url: string }> {
    try {
      const stripeInstance = this.checkStripe();
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card', 'link'], // card enables Google Pay & Apple Pay automatically
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic',
          },
        },
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        customer_creation: customerId ? undefined : 'always',
      };

      if (customerId) {
        sessionParams.customer = customerId;
      }

      const session = await stripeInstance.checkout.sessions.create(sessionParams);

      return {
        sessionId: session.id,
        url: session.url!,
      };
    } catch (error) {
      console.error('Error creating subscription session:', error);
      throw new Error('Failed to create subscription session');
    }
  }

  /**
   * Create a one-time payment checkout session
   */
  async createCheckoutSession(
    amount: number,
    currency: string = 'usd',
    productName: string,
    successUrl: string = `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    cancelUrl: string = `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
    metadata?: Record<string, string>
  ): Promise<{ sessionId: string; url: string }> {
    try {
      const stripeInstance = this.checkStripe();
      const session = await stripeInstance.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card', 'link'], // card enables Google Pay & Apple Pay automatically
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic',
          },
        },
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: productName,
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        metadata,
      });

      return {
        sessionId: session.id,
        url: session.url!,
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const stripeInstance = this.checkStripe();
      const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret!,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw new Error('Failed to retrieve payment intent');
    }
  }

  /**
   * Create or retrieve a customer
   */
  async createOrRetrieveCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Customer> {
    try {
      const stripeInstance = this.checkStripe();

      // Check if customer already exists
      const existingCustomers = await stripeInstance.customers.list({ email, limit: 1 });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Create new customer
      const customer = await stripeInstance.customers.create({
        email,
        name,
        metadata,
      });

      return customer;
    } catch (error) {
      console.error('Error creating/retrieving customer:', error);
      throw new Error('Failed to create or retrieve customer');
    }
  }

  /**
   * Get customer's payment methods
   */
  async getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const stripeInstance = this.checkStripe();
      const paymentMethods = await stripeInstance.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      console.error('Error retrieving payment methods:', error);
      throw new Error('Failed to retrieve payment methods');
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const stripeInstance = this.checkStripe();
      const subscription = await stripeInstance.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const stripeInstance = this.checkStripe();
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      throw new Error('Failed to retrieve subscription');
    }
  }

  /**
   * Create a refund
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ): Promise<Stripe.Refund> {
    try {
      const stripeInstance = this.checkStripe();
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason,
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await stripeInstance.refunds.create(refundParams);
      return refund;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw new Error('Failed to create refund');
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(
    rawBody: string,
    signature: string,
    webhookSecret: string
  ): Promise<Stripe.Event> {
    try {
      const stripeInstance = this.checkStripe();
      const event = stripeInstance.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );

      return event;
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw new Error('Invalid webhook signature');
    }
  }
}

export default StripeService;
