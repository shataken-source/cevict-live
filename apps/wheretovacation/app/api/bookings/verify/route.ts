import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'
import { getOrCreateSharedUser, getSharedUser } from '@/lib/shared-users'
import { fetchUsdToRate } from '@/lib/fx'
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
      const admin = getSupabaseAdminClient()
      if (admin && session.metadata) {
        const userId = session.metadata.userId as string | undefined
        const rentalId = session.metadata.rentalId as string | undefined
        const checkIn = session.metadata.checkIn as string
        const checkOut = session.metadata.checkOut as string
        const nights = parseInt(session.metadata.nights || '0', 10)
        const amountUsd = session.amount_total ? session.amount_total / 100 : 0

        if (!userId) {
          console.warn('[bookings/verify] Missing userId in Stripe session metadata')
        } else {
          // Ensure shared user exists (for unified_bookings)
          await getOrCreateSharedUser(userId, session.customer_email || session.customer_details?.email || '')
          const sharedUser = await getSharedUser(userId)
          const displayCurrency = (sharedUser?.preferred_currency || 'USD').toUpperCase()
          const fxSnapshot = displayCurrency !== 'USD' ? await fetchUsdToRate(displayCurrency) : { from: 'USD' as const, to: 'USD' as const, rate: 1, at: new Date().toISOString() }

          const { data: bookingRow, error: insertError } = await admin
            .from('bookings')
            .insert({
              rental_id: rentalId || null,
              user_id: userId,
              check_in: checkIn,
              check_out: checkOut,
              nights,
              total_amount: amountUsd,
              amount_usd: amountUsd,
              stripe_session_id: sessionId,
              stripe_payment_intent_id: session.payment_intent ? String(session.payment_intent) : null,
              payment_status: session.payment_status,
              status: 'confirmed',
              ...(fxSnapshot && fxSnapshot.to !== 'USD' && {
                fx_currency: fxSnapshot.to,
                fx_rate_to_usd: fxSnapshot.rate,
                fx_snapshot_at: fxSnapshot.at,
              }),
            })
            .select('id')
            .single()

          if (insertError) {
            console.error('[bookings/verify] insert booking error', insertError)
          } else if (bookingRow?.id && rentalId) {
            // Link to unified_bookings (rental_only) for cross-platform bundle reporting
            const wtvTotal = amountUsd
            await admin.from('unified_bookings').insert({
              user_id: userId,
              booking_type: 'rental_only',
              wtv_booking_id: bookingRow.id,
              wtv_property_id: rentalId,
              wtv_check_in: checkIn,
              wtv_check_out: checkOut,
              wtv_nights: nights,
              wtv_total: wtvTotal,
              wtv_subtotal: wtvTotal,
              subtotal: wtvTotal,
              total_amount: wtvTotal,
              total_amount_usd: wtvTotal,
              payment_status: 'paid',
              status: 'confirmed',
              stripe_session_id: sessionId,
              ...(fxSnapshot && fxSnapshot.to !== 'USD' && {
                fx_currency: fxSnapshot.to,
                fx_rate_to_usd: fxSnapshot.rate,
                fx_snapshot_at: fxSnapshot.at,
              }),
            })
          }
        }
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
