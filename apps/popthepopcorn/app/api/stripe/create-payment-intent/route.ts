import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

/**
 * Create Payment Intent for Kernel Pack Purchase
 */
export async function POST(request: NextRequest) {
  try {
    const { packId, userIdentifier } = await request.json()

    // Validate pack exists
    const { KERNEL_PACKS } = await import('@/lib/monetization')
    const pack = KERNEL_PACKS.find(p => p.id === packId)
    
    if (!pack) {
      return NextResponse.json({ error: 'Invalid pack ID' }, { status: 400 })
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pack.price, // in cents
      currency: 'usd',
      metadata: {
        packId,
        packName: pack.name,
        kernels: pack.kernels + (pack.bonus || 0),
        userIdentifier: userIdentifier || 'anonymous',
        type: 'kernel_pack',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('[Stripe] Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
