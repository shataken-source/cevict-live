import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

/**
 * Create Subscription for Season Pass
 */
export async function POST(request: NextRequest) {
  try {
    const { userIdentifier, email } = await request.json()

    // Get Season Pass details
    const { SEASON_PASS } = await import('@/lib/monetization')

    // Create or retrieve customer
    let customer
    try {
      const customers = await stripe.customers.list({
        email: email,
        limit: 1,
      })
      
      if (customers.data.length > 0) {
        customer = customers.data[0]
      } else {
        customer = await stripe.customers.create({
          email: email,
          metadata: {
            userIdentifier: userIdentifier || 'anonymous',
          },
        })
      }
    } catch (error) {
      console.error('[Stripe] Error creating/retrieving customer:', error)
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      )
    }

    // Create price (if not exists, create it)
    // In production, create prices in Stripe Dashboard and store IDs
    const priceId = process.env.STRIPE_SEASON_PASS_PRICE_ID
    
    if (!priceId) {
      // Create price on the fly (not recommended for production)
      const price = await stripe.prices.create({
        unit_amount: SEASON_PASS.price, // in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        product_data: {
          name: SEASON_PASS.name,
        },
      })

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
        metadata: {
          userIdentifier: userIdentifier || 'anonymous',
          type: 'season_pass',
        },
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      })

      const latestInvoice = subscription.latest_invoice as Stripe.Invoice
      const paymentIntent = latestInvoice?.payment_intent
      const clientSecret = typeof paymentIntent === 'object' && paymentIntent !== null
        ? paymentIntent.client_secret
        : null

      return NextResponse.json({
        subscriptionId: subscription.id,
        clientSecret,
        status: subscription.status,
      })
    } else {
      // Use existing price
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        metadata: {
          userIdentifier: userIdentifier || 'anonymous',
          type: 'season_pass',
        },
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      })

      const latestInvoice = subscription.latest_invoice as Stripe.Invoice
      const paymentIntent = latestInvoice?.payment_intent
      const clientSecret = typeof paymentIntent === 'object' && paymentIntent !== null
        ? paymentIntent.client_secret
        : null

      return NextResponse.json({
        subscriptionId: subscription.id,
        clientSecret,
        status: subscription.status,
      })
    }
  } catch (error) {
    console.error('[Stripe] Error creating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
