import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, getServerUser } from '@/lib/supabase'
import Stripe from 'stripe'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  return new Stripe(key, { apiVersion: '2023-10-16' })
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { rentalId, rentalName, checkIn, checkOut } = body
    const userId = user.id

    if (!rentalId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get rental details
    const admin = getSupabaseAdminClient()
    if (!admin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    const { data: rental, error: rentalError } = await admin
      .from('accommodations')
      .select('nightly_rate, cleaning_fee')
      .eq('id', rentalId)
      .single()

    if (rentalError || !rental) {
      return NextResponse.json(
        { error: 'Rental not found' },
        { status: 404 }
      )
    }

    // Calculate total
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    const nightlyRate = rental.nightly_rate || 0
    const cleaningFee = rental.cleaning_fee || 0
    const subtotal = nightlyRate * nights
    const total = subtotal + cleaningFee

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: rentalName,
              description: `${checkIn} to ${checkOut} (${nights} nights)`,
            },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/bookings/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/rentals/${rentalId}`,
      metadata: {
        rentalId,
        checkIn,
        checkOut,
        nights: nights.toString(),
        userId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    )
  }
}
