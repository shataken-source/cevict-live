import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' })

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function resolveTier(priceId: string): 'free' | 'pro' | 'elite' {
  const elitePriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID,
  ].filter(Boolean)
  const proPriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  ].filter(Boolean)
  if (elitePriceIds.includes(priceId)) return 'elite'
  if (proPriceIds.includes(priceId)) return 'pro'
  return 'free'
}

async function upsertProfile(email: string, tier: 'free' | 'pro' | 'elite', subscriptionId: string, status: string) {
  const supabase = getSupabase()
  await supabase.from('profiles').upsert({
    email: email.toLowerCase(),
    tier,
    stripe_subscription_id: subscriptionId,
    subscription_status: status,
    manual_override: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'email', ignoreDuplicates: false })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const email = session.customer_details?.email || session.metadata?.userId
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : ''
        const tier = (session.metadata?.tier as 'pro' | 'elite') || 'pro'
        if (email) await upsertProfile(email, tier, subscriptionId, 'active')
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0]?.price.id
        const tier = priceId ? resolveTier(priceId) : 'free'
        const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer
        const email = customer.email
        if (email) await upsertProfile(email, tier, sub.id, sub.status)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer
        const email = customer.email
        if (email) await upsertProfile(email, 'free', sub.id, 'canceled')
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer
        const email = customer.email
        const subId = typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : ''
        if (email) await upsertProfile(email, 'free', subId, 'past_due')
        break
      }
    }
  } catch (err: any) {
    console.error(`Webhook handler error for ${event.type}:`, err.message)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
