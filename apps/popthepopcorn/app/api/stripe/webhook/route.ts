import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { purchaseKernelPack, subscribeToSeasonPass } from '@/lib/monetization'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

/**
 * Stripe Webhook Handler
 * Handles payment confirmations and subscription events
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const { packId, userIdentifier, type } = paymentIntent.metadata

        if (type === 'kernel_pack' && packId && userIdentifier) {
          // Award kernels to user
          await purchaseKernelPack(userIdentifier, packId, paymentIntent.id)
          console.log(`[Stripe Webhook] Awarded kernels for pack ${packId} to user ${userIdentifier}`)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const { userIdentifier } = subscription.metadata

        if (userIdentifier && subscription.status === 'active') {
          // Activate season pass
          await subscribeToSeasonPass(userIdentifier, subscription.id)
          console.log(`[Stripe Webhook] Activated season pass for user ${userIdentifier}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const { userIdentifier } = subscription.metadata

        if (userIdentifier) {
          // Season pass expired - handled by hasActiveSeasonPass check
          console.log(`[Stripe Webhook] Season pass expired for user ${userIdentifier}`)
        }
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
