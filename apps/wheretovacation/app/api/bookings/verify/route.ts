import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import Stripe from 'stripe'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  return new Stripe(key, { apiVersion: '2023-10-16' })
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const sessionId = request.nextUrl.searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid') {
      // Create booking record in database
      const admin = getSupabaseAdminClient()
      if (admin && session.metadata) {
        await admin.from('bookings').insert({
          rental_id: session.metadata.rentalId,
          user_id: session.customer_email, // In production, use actual user ID
          check_in: session.metadata.checkIn,
          check_out: session.metadata.checkOut,
          nights: parseInt(session.metadata.nights || '0'),
          total_amount: session.amount_total ? session.amount_total / 100 : 0,
          stripe_session_id: sessionId,
          status: 'confirmed',
        })
      }

      return NextResponse.json({ success: true, booking: session.metadata })
    }

    return NextResponse.json({ success: false, payment_status: session.payment_status })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to verify booking', details: error.message },
      { status: 500 }
    )
  }
}
