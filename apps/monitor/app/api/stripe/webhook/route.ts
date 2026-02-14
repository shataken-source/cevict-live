import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { upsertSubscription, deleteSubscription } from '@/lib/subscription-store';
import type { Plan } from '@/lib/subscription-store';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' });
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function getPlanFromPriceId(priceId: string | undefined): Plan {
  if (!priceId) return 'free';
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_ID_TEAM) return 'team';
  return 'free';
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  const stripe = getStripe();

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId as string | undefined;

        if (userId && session.subscription) {
          const raw = await stripe.subscriptions.retrieve(session.subscription as string);
          const sub = raw as Stripe.Subscription & { current_period_end?: number };
          const priceId = sub.items.data[0]?.price?.id;
          const plan = getPlanFromPriceId(priceId);
          const periodEnd = typeof sub.current_period_end === 'number' ? sub.current_period_end : null;
          await upsertSubscription({
            user_id: userId,
            plan,
            status: sub.status,
            stripe_subscription_id: sub.id,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            trial_ends_at: null,
          });
          console.log(`Monitor: user ${userId} subscribed to ${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription & { current_period_end?: number };
        const userId = sub.metadata?.userId as string | undefined;
        if (userId) {
          const priceId = sub.items.data[0]?.price?.id;
          const plan = getPlanFromPriceId(priceId);
          const periodEnd = typeof sub.current_period_end === 'number' ? sub.current_period_end : null;
          await upsertSubscription({
            user_id: userId,
            plan,
            status: sub.status,
            stripe_subscription_id: sub.id,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            trial_ends_at: null,
          });
          console.log(`Monitor: user ${userId} subscription updated: ${plan} (${sub.status})`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId as string | undefined;
        if (userId) {
          await deleteSubscription(userId);
          console.log(`Monitor: user ${userId} subscription canceled`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Monitor: payment failed for invoice ${invoice.id}`);
        break;
      }

      default:
        console.log(`Monitor: unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Monitor webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
