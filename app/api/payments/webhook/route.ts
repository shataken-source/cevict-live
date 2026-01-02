import { NextRequest, NextResponse } from 'next/server';
import StripeService from '@/lib/stripe';
import EmailService from '@/lib/emailService';
import SMSService from '@/lib/sms';
import { securityMiddleware } from '@/lib/security-middleware';

export async function POST(request: NextRequest) {
  // Apply security middleware (no rate limit for webhooks, but validate)
  const securityResponse = await securityMiddleware(request, {
    rateLimitType: 'default',
    requireApiKey: false, // Webhooks use signature instead
  });

  if (securityResponse && securityResponse.status !== 200) {
    return securityResponse;
  }

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe signature' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const stripeService = StripeService.getInstance();
    if (!stripeService) {
      console.error('Stripe service not initialized');
      return NextResponse.json(
        { error: 'Payment service unavailable' },
        { status: 503 }
      );
    }

    const event = await stripeService.handleWebhook(
      body,
      signature,
      webhookSecret
    );

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as any);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as any);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as any);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as any);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as any);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as any);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as any);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSucceeded(paymentIntent: any) {
  console.log('Payment succeeded:', paymentIntent.id);
  
  // Send confirmation email
  const emailService = EmailService.getInstance();
  if (paymentIntent.metadata?.userEmail) {
    await emailService.sendEmail({
      to: paymentIntent.metadata.userEmail,
      subject: 'Payment Successful',
      html: `
        <h2>Payment Successful</h2>
        <p>Thank you for your payment of $${(paymentIntent.amount / 100).toFixed(2)}.</p>
        <p>Payment ID: ${paymentIntent.id}</p>
      `,
      text: `Payment Successful\n\nThank you for your payment of $${(paymentIntent.amount / 100).toFixed(2)}.\nPayment ID: ${paymentIntent.id}`
    });
  }

  // Update user subscription status in database
  // This would integrate with your user management system
}

async function handlePaymentFailed(paymentIntent: any) {
  console.log('Payment failed:', paymentIntent.id);
  
  // Send failure notification
  const emailService = EmailService.getInstance();
  if (paymentIntent.metadata?.userEmail) {
    await emailService.sendEmail({
      to: paymentIntent.metadata.userEmail,
      subject: 'Payment Failed',
      html: `
        <h2>Payment Failed</h2>
        <p>Your payment of $${(paymentIntent.amount / 100).toFixed(2)} could not be processed.</p>
        <p>Please update your payment information and try again.</p>
      `,
      text: `Payment Failed\n\nYour payment of $${(paymentIntent.amount / 100).toFixed(2)} could not be processed.\nPlease update your payment information and try again.`
    });
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  // Send receipt email
  const emailService = EmailService.getInstance();
  if (invoice.customer_email) {
    await emailService.sendEmail({
      to: invoice.customer_email,
      subject: 'Payment Receipt',
      html: `
        <h2>Payment Receipt</h2>
        <p>Thank you for your payment of $${(invoice.amount_paid / 100).toFixed(2)}.</p>
        <p>Invoice ID: ${invoice.id}</p>
        <p>Date: ${new Date(invoice.created * 1000).toLocaleDateString()}</p>
      `,
      text: `Payment Receipt\n\nThank you for your payment of $${(invoice.amount_paid / 100).toFixed(2)}.\nInvoice ID: ${invoice.id}\nDate: ${new Date(invoice.created * 1000).toLocaleDateString()}`
    });
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  console.log('Invoice payment failed:', invoice.id);
  
  // Send payment failure notification
  const emailService = EmailService.getInstance();
  if (invoice.customer_email) {
    await emailService.sendEmail({
      to: invoice.customer_email,
      subject: 'Payment Failed - Action Required',
      html: `
        <h2>Payment Failed</h2>
        <p>Your recent payment could not be processed.</p>
        <p>Amount: $${(invoice.amount_due / 100).toFixed(2)}</p>
        <p>Please update your payment information to avoid service interruption.</p>
      `,
      text: `Payment Failed\n\nYour recent payment could not be processed.\nAmount: $${(invoice.amount_due / 100).toFixed(2)}\nPlease update your payment information to avoid service interruption.`
    });
  }

  // Send SMS notification if configured
  const smsService = SMSService.getInstance();
  if (invoice.customer_phone) {
    await smsService.sendSMS({
      to: invoice.customer_phone,
      body: `SmokersRights: Payment failed. Please update your payment information to avoid service interruption.`,
      priority: 'high'
    });
  }
}

async function handleSubscriptionCreated(subscription: any) {
  console.log('Subscription created:', subscription.id);
  
  // Send welcome email for new subscription
  const emailService = EmailService.getInstance();
  if (subscription.customer_details?.email) {
    await emailService.sendEmail({
      to: subscription.customer_details.email,
      subject: 'Subscription Activated',
      html: `
        <h2>Welcome to SmokersRights Premium!</h2>
        <p>Your subscription has been activated successfully.</p>
        <p>Subscription ID: ${subscription.id}</p>
        <p>Next billing date: ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}</p>
      `,
      text: `Welcome to SmokersRights Premium!\n\nYour subscription has been activated successfully.\nSubscription ID: ${subscription.id}\nNext billing date: ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`
    });
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('Subscription updated:', subscription.id);
  // Handle subscription updates (plan changes, etc.)
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription.id);
  
  // Send cancellation confirmation
  const emailService = EmailService.getInstance();
  if (subscription.customer_details?.email) {
    await emailService.sendEmail({
      to: subscription.customer_details.email,
      subject: 'Subscription Cancelled',
      html: `
        <h2>Subscription Cancelled</h2>
        <p>Your SmokersRights subscription has been cancelled.</p>
        <p>You will continue to have access until ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}.</p>
        <p>We're sorry to see you go!</p>
      `,
      text: `Subscription Cancelled\n\nYour SmokersRights subscription has been cancelled.\nYou will continue to have access until ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}.\nWe're sorry to see you go!`
    });
  }
}
